import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    passenger: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock the Cognito Client send method which is initialized inside the constructor
    (service as any).cognitoClient = {
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      passportNumber: 'AB123456',
    };

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.passenger.findUnique.mockResolvedValue({ id: '1' });
      
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should successfully register user, encrypt passport, and emit KYC event', async () => {
      mockPrismaService.passenger.findUnique.mockResolvedValue(null);
      mockEncryptionService.encrypt.mockResolvedValue('encrypted-passport');
      
      const createdPassenger = {
        id: 'passenger-1',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        passportNumber: 'encrypted-passport',
      };
      
      mockPrismaService.passenger.create.mockResolvedValue(createdPassenger);
      (service as any).cognitoClient.send.mockResolvedValue({}); // Simulate successful Cognito

      const result = await service.register(registerDto);

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('AB123456');
      expect(prismaService.passenger.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('kyc.requested', {
        passengerId: 'passenger-1',
        passportNumber: 'AB123456',
      });
      expect(result).not.toHaveProperty('passportNumber'); // Should be omitted from result
      expect(result.id).toBe('passenger-1');
    });

    it('should throw ConflictException if Cognito fails', async () => {
      mockPrismaService.passenger.findUnique.mockResolvedValue(null);
      (service as any).cognitoClient.send.mockRejectedValue(new Error('Cognito Error'));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(prismaService.passenger.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should successfully authenticate and return token', async () => {
      (service as any).cognitoClient.send.mockResolvedValue({
        AuthenticationResult: { IdToken: 'valid-jwt-token' }
      });
      mockPrismaService.passenger.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

      const result = await service.login(loginDto);

      expect(result).toEqual({ access_token: 'valid-jwt-token' });
    });

    it('should throw UnauthorizedException if Cognito fails', async () => {
      (service as any).cognitoClient.send.mockRejectedValue(new Error('Invalid password'));

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if passenger not in local DB', async () => {
      (service as any).cognitoClient.send.mockResolvedValue({
        AuthenticationResult: { IdToken: 'valid-jwt-token' }
      });
      mockPrismaService.passenger.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
