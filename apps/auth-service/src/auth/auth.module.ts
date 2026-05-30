import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CognitoAuthGuard } from './cognito.guard';
import { EncryptionService } from '../common/encryption/encryption.service';
import { EmailService } from './email.service';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, CognitoAuthGuard, EncryptionService, EmailService, RedisBusService, JwtStrategy],
  exports: [CognitoAuthGuard],
})
export class AuthModule {}
