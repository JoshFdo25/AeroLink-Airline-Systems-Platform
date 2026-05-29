import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { FlightGateway } from './flight.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class FlightsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private redisBus: RedisBusService,
    private flightGateway: FlightGateway
  ) {}

  async create(createFlightDto: CreateFlightDto) {
    const flight = await this.prisma.flight.create({
      data: {
        ...createFlightDto,
        departureTime: new Date(createFlightDto.departureTime),
        arrivalTime: new Date(createFlightDto.arrivalTime),
      },
    });
    // Invalidate search cache after creating a new flight
    await this.cacheManager.del('all_flights');
    return flight;
  }

  async findAll() {
    const cachedFlights = await this.cacheManager.get('all_flights');
    if (cachedFlights) {
      console.log('[Cache Hit] Returning flights from Redis Cache!');
      return cachedFlights;
    }

    console.log('[Cache Miss] Fetching flights from PostgreSQL');
    const flights = await this.prisma.flight.findMany({
      orderBy: { departureTime: 'asc' }
    });
    
    // Store in cache for 60 seconds (cache-manager v5 sets TTL in ms)
    await this.cacheManager.set('all_flights', flights, 60000);
    return flights;
  }

  async findOne(id: string) {
    const cacheKey = `flight_${id}`;
    const cachedFlight = await this.cacheManager.get(cacheKey);
    if (cachedFlight) {
      console.log(`[Cache Hit] Returning flight ${id} from Redis Cache!`);
      return cachedFlight;
    }

    console.log(`[Cache Miss] Fetching flight ${id} from PostgreSQL`);
    const flight = await this.prisma.flight.findUnique({ where: { id } });
    
    if (flight) {
      await this.cacheManager.set(cacheKey, flight, 60000);
    }
    return flight;
  }

  async update(id: string, updateFlightDto: UpdateFlightDto) {
    const data: any = { ...updateFlightDto };
    if (data.departureTime) data.departureTime = new Date(data.departureTime);
    if (data.arrivalTime) data.arrivalTime = new Date(data.arrivalTime);

    const flight = await this.prisma.flight.update({
      where: { id },
      data,
    });

    // Invalidate caches
    await this.cacheManager.del('all_flights');
    await this.cacheManager.del(`flight_${id}`);
    
    if (updateFlightDto.status) {
      this.flightGateway.broadcastFlightStatus(id, updateFlightDto.status, flight.flightNumber);
      
      this.redisBus.publish('flight.status.updated', {
        flightId: id,
        status: updateFlightDto.status,
      });
    }
    
    return flight;
  }

  async remove(id: string) {
    const flight = await this.prisma.flight.delete({ where: { id } });
    await this.cacheManager.del('all_flights');
    await this.cacheManager.del(`flight_${id}`);
    return flight;
  }

  async getSeatStatuses(flightId: string) {
    const flight = await this.prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) throw new NotFoundException('Flight not found');

    const lockedSeats: string[] = [];
    const seatIds: string[] = [];
    // Generate standard seat IDs up to 42 rows
    for (let r = 1; r <= 42; r++) {
      for (const c of ['A', 'B', 'C', 'D', 'E', 'F']) seatIds.push(`${r}${c}`);
    }

    const results = await Promise.all(
      seatIds.map(s => this.cacheManager.get(`flight:${flightId}:seat:${s}:lock`))
    );

    results.forEach((res, index) => {
      if (res) lockedSeats.push(seatIds[index]);
    });

    return {
      bookedSeats: flight.bookedSeats,
      lockedSeats,
    };
  }

  async lockSeat(flightId: string, seatNumber: string) {
    const flight = await this.prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) throw new NotFoundException('Flight not found');
    
    if (flight.bookedSeats.includes(seatNumber)) {
      throw new BadRequestException('Seat is already permanently booked.');
    }

    const lockKey = `flight:${flightId}:seat:${seatNumber}:lock`;
    const existingLock = await this.cacheManager.get(lockKey);
    if (existingLock) {
      throw new BadRequestException('Seat is currently locked by another passenger.');
    }

    // 5 minutes lock
    await this.cacheManager.set(lockKey, 'LOCKED', 300000);
    
    // Broadcast via WebSockets
    this.flightGateway.broadcastSeatStatus(flightId, seatNumber, 'LOCKED');

    return { success: true, message: `Seat ${seatNumber} locked for 5 minutes.` };
  }

  async unlockSeat(flightId: string, seatNumber: string) {
    const lockKey = `flight:${flightId}:seat:${seatNumber}:lock`;
    await this.cacheManager.del(lockKey);
    this.flightGateway.broadcastSeatStatus(flightId, seatNumber, 'AVAILABLE');
    return { success: true, message: `Seat ${seatNumber} unlocked.` };
  }

  @OnEvent('booking.created')
  async handleBookingCreated(payload: any) {
    console.log(`[Saga] Intercepted booking.created for Flight ${payload.flightId}, Seat ${payload.seatNumber}.`);
    const flight = await this.prisma.flight.findUnique({ where: { id: payload.flightId } });
    
    if (flight && !flight.bookedSeats.includes(payload.seatNumber)) {
      // 1. Permanently Reserve the seat
      await this.prisma.flight.update({
        where: { id: payload.flightId },
        data: { 
          availableSeats: { decrement: 1 },
          bookedSeats: { push: payload.seatNumber }
        },
      });

      // 2. Remove Redis Lock
      await this.cacheManager.del(`flight:${payload.flightId}:seat:${payload.seatNumber}:lock`);

      // 3. Broadcast BOOKED over WebSockets
      this.flightGateway.broadcastSeatStatus(payload.flightId, payload.seatNumber, 'BOOKED');

      console.log(`[Saga] Seat ${payload.seatNumber} permanently reserved!`);
      this.redisBus.publish('seat.reserved', payload);
    } else {
      console.log(`[Saga] Seat ${payload.seatNumber} unavailable! Emitting failure.`);
      this.redisBus.publish('seat.reservation.failed', payload);
    }
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(payload: any) {
    console.log(`[Saga Rollback] Intercepted booking.cancelled for Flight ${payload.flightId}. Releasing seat ${payload.seatNumber}...`);
    
    // We need to fetch and filter out the seat from the array. Prisma doesn't have a simple "remove from array" atomic op.
    const flight = await this.prisma.flight.findUnique({ where: { id: payload.flightId } });
    if (flight) {
      const updatedSeats = flight.bookedSeats.filter(s => s !== payload.seatNumber);
      await this.prisma.flight.update({
        where: { id: payload.flightId },
        data: { 
          availableSeats: { increment: 1 },
          bookedSeats: updatedSeats
        },
      });
      
      // Broadcast AVAILABLE over WebSockets
      this.flightGateway.broadcastSeatStatus(payload.flightId, payload.seatNumber, 'AVAILABLE');
    }

    console.log(`[Saga Rollback] Seat released!`);
  }
}
