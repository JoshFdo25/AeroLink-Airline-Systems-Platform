import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateBookingCommand } from './commands/create-booking.command';
import { GetBookingQuery } from './queries/get-booking.query';
import { CreateBookingDto } from './dto/booking.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flight booking' })
  @ApiResponse({ status: 201, description: 'Booking initiated and Saga started.' })
  async createBooking(@Body() dto: CreateBookingDto) {
    // Dispatch to CQRS Write Model
    return this.commandBus.execute(
      new CreateBookingCommand(dto.passengerId, dto.flightId, dto.seatNumber, dto.paymentToken, dto.price)
    );
  }

  @Get('passenger/:id')
  @ApiOperation({ summary: 'Get all bookings for a passenger' })
  async getPassengerBookings(@Param('id') passengerId: string) {
    // Dispatch to CQRS Read Model
    return this.queryBus.execute(new GetBookingQuery(passengerId));
  }
}
