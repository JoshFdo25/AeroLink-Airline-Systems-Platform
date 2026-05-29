import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private encryptionService: EncryptionService,
    private eventEmitter: EventEmitter2,
  ) { }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.passenger.findUnique({ where: { email: registerDto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const encryptedPassport = this.encryptionService.encrypt(registerDto.passportNumber);

    const passenger = await this.prisma.passenger.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        passportNumber: encryptedPassport,
      },
    });

    // Publish Event-Driven KYC Request
    console.log(`[EventBridge Mock] Publishing KycVerificationRequested for passenger ${passenger.id}`);
    this.eventEmitter.emit('kyc.requested', {
      passengerId: passenger.id,
      passportNumber: registerDto.passportNumber, // Sent securely to internal KYC service
    });

    const { password, passportNumber, ...result } = passenger;
    return result;
  }

  async login(loginDto: LoginDto) {
    const passenger = await this.prisma.passenger.findUnique({ where: { email: loginDto.email } });
    if (!passenger) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(loginDto.password, passenger.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: passenger.id, email: passenger.email, role: passenger.role, kycVerified: passenger.kycVerified };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async seedAdmin() {
    const existing = await this.prisma.passenger.findUnique({ where: { email: 'admin@aerolink.com' } });
    if (existing) return { message: 'Admin already exists!' };

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await this.prisma.passenger.create({
      data: {
        email: 'admin@aerolink.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        kycVerified: true,
      },
    });
    return { message: 'Admin successfully created with email admin@aerolink.com and password admin123' };
  }
}
