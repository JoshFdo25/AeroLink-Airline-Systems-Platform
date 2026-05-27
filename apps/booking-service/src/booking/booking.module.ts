import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BookingController } from './booking.controller';
import { CreateBookingHandler } from './commands/handlers/create-booking.handler';
import { GetBookingHandler } from './queries/handlers/get-booking.handler';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';

@Module({
  imports: [CqrsModule],
  controllers: [BookingController],
  providers: [CreateBookingHandler, GetBookingHandler, RedisBusService],
  exports: [RedisBusService],
})
export class BookingModule {}
