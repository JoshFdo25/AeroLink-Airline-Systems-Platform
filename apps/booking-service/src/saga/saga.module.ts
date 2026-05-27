import { Module } from '@nestjs/common';
import { PaymentMockService } from './payment-mock.service';
import { BookingSagaService } from './booking-saga.service';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule], // to get RedisBusService
  providers: [PaymentMockService, BookingSagaService],
})
export class SagaModule {}
