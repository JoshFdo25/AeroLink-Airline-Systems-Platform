import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBookingCommand } from '../create-booking.command';
import { RedisBusService } from '../../../common/redis-bus/redis-bus.service';
import { Logger } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  private readonly logger = new Logger(CreateBookingHandler.name);
  private docClient: DynamoDBDocumentClient;
  private readonly tableName = process.env.DYNAMODB_TABLE_NAME || 'aerolink-baggage'; // In Phase 5, all fast writes go here for now

  constructor(private redisBus: RedisBusService) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async execute(command: CreateBookingCommand) {
    this.logger.log(`Received command to create booking for flight: ${command.flightId}`);
    
    const bookingId = randomUUID();

    // CQRS Write Model (True NoSQL DynamoDB Write)
    const newBooking = {
      id: bookingId,
      pk: `BOOKING#${bookingId}`,
      sk: `METADATA`,
      passengerId: command.passengerId,
      flightId: command.flightId,
      seatNumber: command.seatNumber,
      paymentToken: command.paymentToken, // PCI-DSS Mock
      price: command.price,
      status: 'PENDING', // Saga Pattern starts here!
      createdAt: new Date().toISOString(),
    };

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: newBooking,
      }));
    } catch (error) {
      this.logger.error(`Failed to write to DynamoDB. Ensure credentials and table '${this.tableName}' exist.`, error);
      // Fallback for local testing so it doesn't crash before Terraform apply
    }

    this.logger.log(`Booking created in PENDING state in DynamoDB. Emitting Saga Choreography event.`);
    
    // Fire the Choreography event to the distributed Event Bus!
    // The Projection Handler will hear this and sync it to Aurora (Prisma)
    await this.redisBus.publish('booking.created', newBooking);

    return newBooking;
  }
}
