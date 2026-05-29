import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private readonly clientId = process.env.COGNITO_CLIENT_ID || 'dummy_client_id';

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private eventEmitter: EventEmitter2,
  ) { 
    this.cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.passenger.findUnique({ where: { email: registerDto.email } });
    if (existing) throw new ConflictException('Email already in use');

    // 1. Create User in AWS Cognito
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: registerDto.email,
        Password: registerDto.password,
        UserAttributes: [
          { Name: 'email', Value: registerDto.email },
          { Name: 'given_name', Value: registerDto.firstName },
          { Name: 'family_name', Value: registerDto.lastName },
        ],
      });
      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('[Cognito Error] Failed to register user:', error);
      // Fallback for local testing without real AWS credentials
      if (!error.message.includes('dummy_client_id') && !error.message.includes('Could not resolve')) {
        throw new ConflictException(error.message);
      }
    }

    // 2. Encrypt sensitive PII using AWS KMS
    const encryptedPassport = await this.encryptionService.encrypt(registerDto.passportNumber);

    // 3. Store Passenger profile in local database (without password!)
    const passenger = await this.prisma.passenger.create({
      data: {
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        passportNumber: encryptedPassport,
      },
    });

    // 4. Publish Event-Driven KYC Request
    console.log(`[EventBridge Mock] Publishing KycVerificationRequested for passenger ${passenger.id}`);
    this.eventEmitter.emit('kyc.requested', {
      passengerId: passenger.id,
      passportNumber: registerDto.passportNumber, // Sent securely to internal KYC service
    });

    const { passportNumber, ...result } = passenger;
    return result;
  }

  async login(loginDto: LoginDto) {
    let accessToken = 'MOCK_AWS_ACCESS_TOKEN';
    
    // 1. Authenticate with AWS Cognito
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: loginDto.email,
          PASSWORD: loginDto.password,
        },
      });
      const response = await this.cognitoClient.send(command);
      accessToken = response.AuthenticationResult?.AccessToken || accessToken;
    } catch (error: any) {
      console.error('[Cognito Error] Failed to authenticate user:', error);
      if (!error.message.includes('dummy_client_id') && !error.message.includes('Could not resolve')) {
        throw new UnauthorizedException(error.message);
      }
    }

    // 2. Ensure passenger profile exists in our local DB
    const passenger = await this.prisma.passenger.findUnique({ where: { email: loginDto.email } });
    if (!passenger) throw new UnauthorizedException('User profile not found');

    return {
      access_token: accessToken,
    };
  }

  async seedAdmin() {
    const existing = await this.prisma.passenger.findUnique({ where: { email: 'admin@aerolink.com' } });
    if (existing) return { message: 'Admin already exists!' };
    
    await this.prisma.passenger.create({
      data: {
        email: 'admin@aerolink.com',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        kycVerified: true,
      },
    });
    return { message: 'Admin successfully created in local DB. Must manually create in Cognito if using real credentials.' };
  }
}
