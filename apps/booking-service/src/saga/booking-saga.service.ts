import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';

@Injectable()
export class BookingSagaService {
  private readonly logger = new Logger(BookingSagaService.name);

  constructor(private prisma: PrismaService, private redisBus: RedisBusService) {}

  @OnEvent('payment.successful')
  async handlePaymentSuccess(payload: { bookingId: string }) {
    this.logger.log(`Saga Completed: Updating Booking ${payload.bookingId} to CONFIRMED.`);
    await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CONFIRMED' },
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: { bookingId: string, flightId: string }) {
    this.logger.warn(`Saga Rollback: Payment failed. Cancelling Booking ${payload.bookingId}.`);
    await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CANCELLED' },
    });
    
    // Fire event to Flight Service to release the seat! (Choreography Rollback)
    this.redisBus.publish('booking.cancelled', { flightId: payload.flightId });
  }

  @OnEvent('seat.reservation.failed')
  async handleSeatFailed(payload: { bookingId: string }) {
    this.logger.warn(`Saga Rollback: Seat reservation failed (Flight Full). Cancelling Booking ${payload.bookingId}.`);
    await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CANCELLED' },
    });
  }
}
