import { Module } from '@nestjs/common';
import { PaymentMockService } from './payment-mock.service';
import { BookingSagaService } from './booking-saga.service';
import { BookingModule } from '../booking/booking.module';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BookingModule, PrismaModule], // to get RedisBusService and PrismaService
  providers: [PaymentMockService, BookingSagaService],
})
export class SagaModule {}
