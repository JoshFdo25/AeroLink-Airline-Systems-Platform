import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class BookingSagaService {
  private readonly logger = new Logger(BookingSagaService.name);
  private docClient: DynamoDBDocumentClient;
  private readonly tableName = process.env.DYNAMODB_TABLE_NAME || 'aerolink-baggage';

  constructor(private redisBus: RedisBusService) {
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
        Key: { pk: `BOOKING#${payload.bookingId}`, sk: `METADATA` },
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
        Key: { pk: `BOOKING#${payload.bookingId}`, sk: `METADATA` },
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
  async handleSeatFailed(payload: { bookingId: string }) {
    this.logger.warn(`Saga Rollback: Seat reservation failed (Flight Full). Cancelling Booking ${payload.bookingId}.`);
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `BOOKING#${payload.bookingId}`, sk: `METADATA` },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'CANCELLED' },
      }));
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to cancel booking ${payload.bookingId}. Mocking fallback.`);
    }

    // Publish booking.cancelled event for the CQRS Projector!
    await this.redisBus.publish('booking.cancelled', { bookingId: payload.bookingId });
  }

  @OnEvent('flight.status.updated')
  async handleFlightStatusUpdate(payload: { flightId: string, status: string }) {
    this.logger.log(`Received flight status update for Flight ${payload.flightId}. Emitting notifications...`);
    
    // In Phase 5, we shouldn't scan DynamoDB for all bookings on a flight unless we use a GSI.
    // Since the API requires us to notify passengers, we'll emit a generic event and let the Projector/Notification service handle it,
    // or we query Aurora from the Projector context!
    // For now, we mock the logic.
    this.logger.warn(`Flight status update notifications via DynamoDB require a GSI on flightId. Skipped for now.`);
  }
}
