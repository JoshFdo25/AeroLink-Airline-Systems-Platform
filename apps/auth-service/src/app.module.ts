import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PassengersModule } from './passengers/passengers.module';
import { KycService } from './kyc/kyc.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(), // Enables internal Event-Driven architecture
    PrismaModule,
    AuthModule,
    PassengersModule,
  ],
  providers: [KycService],
})
export class AppModule {}
