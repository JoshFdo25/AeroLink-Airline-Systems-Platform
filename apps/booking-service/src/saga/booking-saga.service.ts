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
    const booking = await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CONFIRMED' },
    });

    // Send confirmation email
    this.redisBus.publish('notification.send_email', {
      passengerId: booking.passengerId,
      subject: `Booking Confirmed: Flight ${booking.flightId}`,
      type: 'BOOKING_CONFIRMED',
      data: {
        flightId: booking.flightId,
        seatNumber: booking.seatNumber,
        price: booking.price,
      }
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: { bookingId: string, flightId: string }) {
    this.logger.warn(`Saga Rollback: Payment failed. Cancelling Booking ${payload.bookingId}.`);
    const booking = await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CANCELLED' },
    });
    
    // Fire event to Flight Service to release the seat! (Choreography Rollback)
    this.redisBus.publish('booking.cancelled', { 
      flightId: payload.flightId, 
      seatNumber: booking.seatNumber 
    });
  }

  @OnEvent('seat.reservation.failed')
  async handleSeatFailed(payload: { bookingId: string }) {
    this.logger.warn(`Saga Rollback: Seat reservation failed (Flight Full). Cancelling Booking ${payload.bookingId}.`);
    await this.prisma.booking.update({
      where: { id: payload.bookingId },
      data: { status: 'CANCELLED' },
    });
  }

  @OnEvent('flight.status.updated')
  async handleFlightStatusUpdate(payload: { flightId: string, status: string }) {
    this.logger.log(`Received flight status update for Flight ${payload.flightId}. Sending emails to passengers...`);
    
    const bookings = await this.prisma.booking.findMany({
      where: {
        flightId: payload.flightId,
        status: 'CONFIRMED',
      }
    });

    for (const booking of bookings) {
      this.redisBus.publish('notification.send_email', {
        passengerId: booking.passengerId,
        subject: `Flight Status Update: Flight ${booking.flightId}`,
        type: 'FLIGHT_STATUS_UPDATED',
        data: {
          flightId: booking.flightId,
          status: payload.status,
        }
      });
    }
  }
}
