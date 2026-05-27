import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBookingCommand } from '../create-booking.command';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisBusService } from '../../../common/redis-bus/redis-bus.service';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  private readonly logger = new Logger(CreateBookingHandler.name);

  constructor(private prisma: PrismaService, private redisBus: RedisBusService) {}

  async execute(command: CreateBookingCommand) {
    this.logger.log(`Received command to create booking for flight: ${command.flightId}`);

    // CQRS Write Model (DynamoDB mock using PostgreSQL for Phase 2)
    const booking = await this.prisma.booking.create({
      data: {
        passengerId: command.passengerId,
        flightId: command.flightId,
        paymentToken: command.paymentToken, // PCI-DSS Mock
        price: command.price,
        status: 'PENDING', // Saga Pattern starts here!
      },
    });

    this.logger.log(`Booking created in PENDING state. Emitting Saga Choreography event.`);
    
    // Fire the Choreography event to the distributed Event Bus!
    this.redisBus.publish('booking.created', {
      bookingId: booking.id,
      passengerId: booking.passengerId,
      flightId: booking.flightId,
      paymentToken: booking.paymentToken,
      price: booking.price
    });

    return booking;
  }
}
