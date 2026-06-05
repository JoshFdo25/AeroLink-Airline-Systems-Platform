import { Test, TestingModule } from '@nestjs/testing';
import { BookingSagaService } from './booking-saga.service';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => {
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: jest.fn(),
      }),
    },
    UpdateCommand: jest.fn(),
    GetCommand: jest.fn(),
  };
});

import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

describe('BookingSagaService', () => {
  let service: BookingSagaService;
  let redisBusService: RedisBusService;
  let prismaService: PrismaService;
  let mockDocClient: any;

  const mockRedisBusService = {
    publish: jest.fn(),
  };

  const mockPrismaService = {
    booking: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingSagaService,
        { provide: RedisBusService, useValue: mockRedisBusService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookingSagaService>(BookingSagaService);
    redisBusService = module.get<RedisBusService>(RedisBusService);
    prismaService = module.get<PrismaService>(PrismaService);
    mockDocClient = (service as any).docClient;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePaymentSuccess', () => {
    it('should update booking to CONFIRMED, emit events, and send email', async () => {
      mockDocClient.send.mockResolvedValue({
        Attributes: { id: 'bk-123', passengerId: 'p-1', flightId: 'f-1', seatNumber: '1A', price: 100 },
      });

      await service.handlePaymentSuccess({ bookingId: 'bk-123' });

      expect(mockDocClient.send).toHaveBeenCalled();
      expect(UpdateCommand).toHaveBeenCalled();
      expect(redisBusService.publish).toHaveBeenCalledWith('booking.confirmed', { bookingId: 'bk-123' });
      expect(redisBusService.publish).toHaveBeenCalledWith('notification.send_email', expect.objectContaining({
        type: 'BOOKING_CONFIRMED',
        passengerId: 'p-1',
      }));
    });

    it('should handle DynamoDB errors gracefully using fallback mock data', async () => {
      mockDocClient.send.mockRejectedValue(new Error('DynamoDB Error'));

      await service.handlePaymentSuccess({ bookingId: 'bk-123' });

      // Should still publish the confirmed event even if Dynamo update failed (due to the try/catch fallback in the code)
      expect(redisBusService.publish).toHaveBeenCalledWith('booking.confirmed', { bookingId: 'bk-123' });
    });
  });

  describe('handlePaymentFailed', () => {
    it('should update booking to CANCELLED and emit rollback events', async () => {
      mockDocClient.send.mockResolvedValue({
        Attributes: { id: 'bk-123', seatNumber: '1A' },
      });

      await service.handlePaymentFailed({ bookingId: 'bk-123', flightId: 'f-1' });

      expect(redisBusService.publish).toHaveBeenCalledWith('booking.cancelled', { bookingId: 'bk-123' });
      expect(redisBusService.publish).toHaveBeenCalledWith('booking.cancelled_seat', {
        flightId: 'f-1',
        seatNumber: '1A',
      });
    });
  });

  describe('handleSeatFailed', () => {
    it('should cancel the booking in DynamoDB and emit booking.cancelled', async () => {
      mockDocClient.send.mockResolvedValue({});

      await service.handleSeatFailed({ bookingId: 'bk-123' });

      expect(redisBusService.publish).toHaveBeenCalledWith('booking.cancelled', { bookingId: 'bk-123' });
    });
  });

  describe('handleFlightStatusUpdate', () => {
    it('should send notification emails to all passengers on the flight', async () => {
      const mockBookings = [
        { id: 'b1', passengerId: 'p1', flightId: 'f-1' },
        { id: 'b2', passengerId: 'p2', flightId: 'f-1' },
      ];
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      await service.handleFlightStatusUpdate({ flightId: 'f-1', status: 'DELAYED' });

      expect(prismaService.booking.findMany).toHaveBeenCalledWith({ where: { flightId: 'f-1' } });
      expect(redisBusService.publish).toHaveBeenCalledTimes(2);
      expect(redisBusService.publish).toHaveBeenNthCalledWith(1, 'notification.send_email', expect.objectContaining({
        passengerId: 'p1',
        type: 'FLIGHT_STATUS_UPDATE',
      }));
      expect(redisBusService.publish).toHaveBeenNthCalledWith(2, 'notification.send_email', expect.objectContaining({
        passengerId: 'p2',
        type: 'FLIGHT_STATUS_UPDATE',
      }));
    });
  });
});
