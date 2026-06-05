import { Test, TestingModule } from '@nestjs/testing';
import { FlightsService } from './flights.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { FlightGateway } from './flight.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('FlightsService', () => {
  let service: FlightsService;
  let prismaService: PrismaService;
  let cacheManager: any;
  let redisBusService: RedisBusService;
  let flightGateway: FlightGateway;

  const mockFlight = {
    id: 'test-flight-123',
    flightNumber: 'AL100',
    origin: 'JFK',
    destination: 'LHR',
    departureTime: new Date(),
    arrivalTime: new Date(),
    status: 'SCHEDULED',
    availableSeats: 250,
    bookedSeats: [],
  };

  const mockPrismaService = {
    flight: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisBusService = {
    publish: jest.fn(),
  };

  const mockFlightGateway = {
    broadcastFlightStatus: jest.fn(),
    broadcastSeatStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlightsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: RedisBusService, useValue: mockRedisBusService },
        { provide: FlightGateway, useValue: mockFlightGateway },
      ],
    }).compile();

    service = module.get<FlightsService>(FlightsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheManager = module.get(CACHE_MANAGER);
    redisBusService = module.get<RedisBusService>(RedisBusService);
    flightGateway = module.get<FlightGateway>(FlightGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return flights from cache if available', async () => {
      const cachedFlights = [mockFlight];
      cacheManager.get.mockResolvedValue(cachedFlights);

      const result = await service.findAll();

      expect(cacheManager.get).toHaveBeenCalledWith('all_flights');
      expect(prismaService.flight.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(cachedFlights);
    });

    it('should fetch from database and cache if cache miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      mockPrismaService.flight.findMany.mockResolvedValue([mockFlight]);

      const result = await service.findAll();

      expect(cacheManager.get).toHaveBeenCalledWith('all_flights');
      expect(prismaService.flight.findMany).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('all_flights', [mockFlight], 60000);
      expect(result).toEqual([mockFlight]);
    });
  });

  describe('lockSeat', () => {
    it('should throw NotFoundException if flight does not exist', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(null);
      await expect(service.lockSeat('invalid-id', '1A')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if seat is already booked', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue({
        ...mockFlight,
        bookedSeats: ['1A'],
      });
      await expect(service.lockSeat(mockFlight.id, '1A')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if seat is locked by someone else', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(mockFlight);
      cacheManager.get.mockResolvedValue('LOCKED');
      await expect(service.lockSeat(mockFlight.id, '1A')).rejects.toThrow(BadRequestException);
    });

    it('should lock seat and broadcast status', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(mockFlight);
      cacheManager.get.mockResolvedValue(null);

      const result = await service.lockSeat(mockFlight.id, '1A');

      expect(cacheManager.set).toHaveBeenCalledWith(`flight:${mockFlight.id}:seat:1A:lock`, 'LOCKED', 300000);
      expect(flightGateway.broadcastSeatStatus).toHaveBeenCalledWith(mockFlight.id, '1A', 'LOCKED');
      expect(result.success).toBe(true);
    });
  });

  describe('Saga: handleBookingCreated', () => {
    it('should permanently reserve seat and remove lock', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue(mockFlight);
      
      const payload = { flightId: mockFlight.id, seatNumber: '1A' };
      await service.handleBookingCreated(payload);

      expect(prismaService.flight.update).toHaveBeenCalledWith({
        where: { id: mockFlight.id },
        data: {
          availableSeats: { decrement: 1 },
          bookedSeats: { push: '1A' },
        },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(`flight:${mockFlight.id}:seat:1A:lock`);
      expect(flightGateway.broadcastSeatStatus).toHaveBeenCalledWith(mockFlight.id, '1A', 'BOOKED');
      expect(redisBusService.publish).toHaveBeenCalledWith('seat.reserved', payload);
    });

    it('should emit seat.reservation.failed if seat is already booked', async () => {
      mockPrismaService.flight.findUnique.mockResolvedValue({
        ...mockFlight,
        bookedSeats: ['1A'], // Already booked
      });
      
      const payload = { flightId: mockFlight.id, seatNumber: '1A' };
      await service.handleBookingCreated(payload);

      expect(redisBusService.publish).toHaveBeenCalledWith('seat.reservation.failed', payload);
      expect(prismaService.flight.update).not.toHaveBeenCalled();
    });
  });
});
