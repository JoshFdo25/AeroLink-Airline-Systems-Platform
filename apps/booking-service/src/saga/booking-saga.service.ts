import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingSagaService {
  private readonly logger = new Logger(BookingSagaService.name);
  private docClient: DynamoDBDocumentClient;
  private readonly tableName = process.env.DYNAMODB_TABLE_NAME || 'aerolink-baggage';

  constructor(private redisBus: RedisBusService, private prisma: PrismaService) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  @OnEvent('payment.successful')
  async handlePaymentSuccess(payload: { bookingId: string }) {
    this.logger.log(`Saga Completed: Updating Booking ${payload.bookingId} to CONFIRMED.`);
    
    let bookingData: any = null;
    try {
      const response = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id: payload.bookingId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'CONFIRMED' },
        ReturnValues: 'ALL_NEW',
      }));
      bookingData = response.Attributes;
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to confirm booking ${payload.bookingId}. Mocking fallback.`);
      bookingData = { id: payload.bookingId, passengerId: 'MOCK', flightId: 'MOCK', seatNumber: 'MOCK', price: 0 };
    }

    // Publish booking.confirmed event for the CQRS Projector!
    await this.redisBus.publish('booking.confirmed', { bookingId: payload.bookingId });

    // Send confirmation email
    await this.redisBus.publish('notification.send_email', {
      passengerId: bookingData.passengerId,
      subject: `Booking Confirmed: Flight ${bookingData.flightId}`,
      type: 'BOOKING_CONFIRMED',
      data: {
        flightId: bookingData.flightId,
        seatNumber: bookingData.seatNumber,
        price: bookingData.price,
      }
    });
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: { bookingId: string, flightId: string }) {
    this.logger.warn(`Saga Rollback: Payment failed. Cancelling Booking ${payload.bookingId}.`);
    
    let bookingData: any = null;
    try {
      const response = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id: payload.bookingId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'CANCELLED' },
        ReturnValues: 'ALL_NEW',
      }));
      bookingData = response.Attributes;
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to cancel booking ${payload.bookingId}. Mocking fallback.`);
      bookingData = { seatNumber: 'MOCK' };
    }

    // Publish booking.cancelled event for the CQRS Projector!
    await this.redisBus.publish('booking.cancelled', { bookingId: payload.bookingId });
    
    // Fire event to Flight Service to release the seat! (Choreography Rollback)
    await this.redisBus.publish('booking.cancelled_seat', { 
      flightId: payload.flightId, 
      seatNumber: bookingData?.seatNumber || 'UNKNOWN' 
    });
  }

  @OnEvent('seat.reservation.failed')
  async handleSeatFailed(payload: any) {
    const bookingId = payload.bookingId || payload.id;
    this.logger.warn(`Saga Rollback: Seat reservation failed (Flight Full). Cancelling Booking ${bookingId}.`);
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { id: bookingId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'CANCELLED' },
      }));
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to cancel booking ${bookingId}. Mocking fallback.`);
    }

    // Publish booking.cancelled event for the CQRS Projector!
    await this.redisBus.publish('booking.cancelled', { bookingId: bookingId });
  }

  @OnEvent('flight.status.updated')
  async handleFlightStatusUpdate(payload: { flightId: string, status: string }) {
    this.logger.log(`Received flight status update for Flight ${payload.flightId}. Emitting notifications...`);
    
    // Query Aurora Read Model to find affected bookings
    const bookings = await this.prisma.booking.findMany({ where: { flightId: payload.flightId } });
    
    for (const booking of bookings) {
      await this.redisBus.publish('notification.send_email', {
        passengerId: booking.passengerId,
        subject: `Flight Status Update: Your flight ${payload.flightId} is now ${payload.status}`,
        type: 'FLIGHT_STATUS_UPDATE',
        data: {
          flightId: payload.flightId,
          status: payload.status,
          bookingId: booking.id,
        }
      });
    }
  }
}
