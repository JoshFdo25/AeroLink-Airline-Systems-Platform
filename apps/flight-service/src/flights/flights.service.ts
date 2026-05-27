import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';

@Injectable()
export class FlightsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    
    return flight;
  }

  async remove(id: string) {
    const flight = await this.prisma.flight.delete({ where: { id } });
    await this.cacheManager.del('all_flights');
    await this.cacheManager.del(`flight_${id}`);
    return flight;
  }
}
