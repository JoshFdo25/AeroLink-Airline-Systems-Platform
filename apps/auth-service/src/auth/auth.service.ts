import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, AdminConfirmSignUpCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

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

      // Auto-confirm the user since this is a demo environment without email SES setup
      const confirmCommand = new AdminConfirmSignUpCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: registerDto.email,
      });
      await this.cognitoClient.send(confirmCommand);
    } catch (error: any) {
      console.error('[Cognito Error] Failed to register user:', error);
      throw new ConflictException(error.message);
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
    let accessToken = '';
    
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
      if (!response.AuthenticationResult?.IdToken) {
        throw new UnauthorizedException('Missing IdToken from Cognito');
      }
      accessToken = response.AuthenticationResult.IdToken;
    } catch (error: any) {
      console.error('[Cognito Error] Failed to authenticate user:', error);
      throw new UnauthorizedException(error.message);
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

    try {
      const cognitoCommand = new AdminCreateUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: 'admin@aerolink.com',
        UserAttributes: [
          { Name: 'email', Value: 'admin@aerolink.com' },
          { Name: 'email_verified', Value: 'true' }
        ],
        MessageAction: 'SUPPRESS',
        TemporaryPassword: 'AdminPassword123!',
      });
      await this.cognitoClient.send(cognitoCommand);

      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: 'admin@aerolink.com',
        Password: 'AdminPassword123!',
        Permanent: true,
      });
      await this.cognitoClient.send(setPasswordCommand);
    } catch (error: any) {
      console.log('Admin already exists in Cognito or failed to create:', error.message);
    }

    return { message: 'Admin successfully seeded in local DB and AWS Cognito.' };
  }
}
