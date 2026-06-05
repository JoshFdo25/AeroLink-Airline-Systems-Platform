import { Test, TestingModule } from '@nestjs/testing';
import { BaggageService } from './baggage.service';
import { BaggageGateway } from './baggage.gateway';
import { NotFoundException } from '@nestjs/common';

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
    PutCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    ScanCommand: jest.fn(),
  };
});

import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

describe('BaggageService', () => {
  let service: BaggageService;
  let baggageGateway: BaggageGateway;
  let mockDocClient: any;

  const mockBaggageGateway = {
    broadcastBaggageUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaggageService,
        { provide: BaggageGateway, useValue: mockBaggageGateway },
      ],
    }).compile();

    service = module.get<BaggageService>(BaggageService);
    baggageGateway = module.get<BaggageGateway>(BaggageGateway);
    mockDocClient = (service as any).docClient;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('should generate an ID and insert bag into DynamoDB', async () => {
      mockDocClient.send.mockResolvedValue({});

      const dto = { passengerId: 'p-1', flightId: 'f-1' };
      const result = await service.checkIn(dto);

      expect(mockDocClient.send).toHaveBeenCalled();
      expect(PutCommand).toHaveBeenCalled();
      
      expect(result).toHaveProperty('id');
      expect(result.passengerId).toBe('p-1');
      expect(result.flightId).toBe('f-1');
      expect(result.status).toBe('CHECKED_IN');
      expect(result.location).toBe('Check-in Counter');
    });

    it('should return bag even if DynamoDB fails (graceful fallback)', async () => {
      mockDocClient.send.mockRejectedValue(new Error('Dynamo Error'));

      const dto = { passengerId: 'p-1', flightId: 'f-1' };
      const result = await service.checkIn(dto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('CHECKED_IN');
    });
  });

  describe('updateStatus', () => {
    const updateDto = { status: 'LOADED', location: 'Gate A1' };

    it('should update DynamoDB and broadcast via WebSocket', async () => {
      mockDocClient.send.mockResolvedValue({
        Attributes: { id: 'bag-1', status: 'LOADED', location: 'Gate A1' },
      });

      const result = await service.updateStatus('bag-1', updateDto);

      expect(mockDocClient.send).toHaveBeenCalled();
      expect(UpdateCommand).toHaveBeenCalled();
      expect(baggageGateway.broadcastBaggageUpdate).toHaveBeenCalledWith(result);
      expect(result.status).toBe('LOADED');
    });

    it('should throw NotFoundException if DynamoDB returns no attributes', async () => {
      // simulate db failure and fallback failing to find bag
      mockDocClient.send.mockResolvedValue({}); // No Attributes means update failed

      // Because the fallback only kicks in on *error*, if response succeeds but is empty:
      // wait, in the actual service code, bag = response.Attributes, which would be undefined.
      // Then if (!bag) throw new NotFoundException.
      
      await expect(service.updateStatus('bag-1', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getByPassenger', () => {
    it('should scan DynamoDB for passenger ID', async () => {
      const mockItems = [{ id: 'bag-1' }];
      mockDocClient.send.mockResolvedValue({ Items: mockItems });

      const result = await service.getByPassenger('p-1');

      expect(mockDocClient.send).toHaveBeenCalled();
      expect(ScanCommand).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });

    it('should return empty array if DynamoDB fails', async () => {
      mockDocClient.send.mockRejectedValue(new Error('Dynamo Error'));

      const result = await service.getByPassenger('p-1');

      expect(result).toEqual([]);
    });
  });
});
