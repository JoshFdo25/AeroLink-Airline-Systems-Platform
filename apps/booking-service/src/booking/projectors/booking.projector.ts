import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TRUE CQRS & EVENT SOURCING PROJECTOR
 * This class listens to Domain Events emitted from the Write Model (DynamoDB) via EventBridge,
 * and projects them into the Read Model (Aurora PostgreSQL via Prisma) for complex queries.
 */
@Injectable()
export class BookingProjector {
  private readonly logger = new Logger(BookingProjector.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('booking.created')
  async handleBookingCreated(payload: any) {
    this.logger.log(`[Projector] Projecting new booking ${payload.id} into Aurora (Read Model)`);
    try {
      await this.prisma.booking.create({
        data: {
          id: payload.id,
          passengerId: payload.passengerId,
          flightId: payload.flightId,
          seatNumber: payload.seatNumber,
          paymentToken: payload.paymentToken,
          price: payload.price,
          status: payload.status,
        },
      });
    } catch (e) {
      this.logger.error(`[Projector] Failed to project booking ${payload.id}`, e);
    }
  }

  @OnEvent('booking.confirmed')
  async handleBookingConfirmed(payload: { bookingId: string }) {
    this.logger.log(`[Projector] Projecting CONFIRMED status for booking ${payload.bookingId} into Aurora`);
    try {
      await this.prisma.booking.update({
        where: { id: payload.bookingId },
        data: { status: 'CONFIRMED' },
      });
    } catch (e) {
      this.logger.error(`[Projector] Failed to project booking.confirmed for ${payload.bookingId}`, e);
    }
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(payload: { bookingId: string }) {
    this.logger.log(`[Projector] Projecting CANCELLED status for booking ${payload.bookingId} into Aurora`);
    try {
      await this.prisma.booking.update({
        where: { id: payload.bookingId },
        data: { status: 'CANCELLED' },
      });
    } catch (e) {
      this.logger.error(`[Projector] Failed to project booking.cancelled for ${payload.bookingId}`, e);
    }
  }
}
