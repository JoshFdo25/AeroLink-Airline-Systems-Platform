import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './booking/booking.module';
import { SagaModule } from './saga/saga.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(), // Internal event bridge
    PrismaModule,
    BookingModule,
    SagaModule,
  ],
})
export class AppModule {}
