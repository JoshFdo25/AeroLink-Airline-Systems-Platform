import { ApiProperty } from '@nestjs/swagger';

export class CreateFlightDto {
  @ApiProperty({ example: 'AL-1024', description: 'Unique flight number' })
  flightNumber: string;

  @ApiProperty({ example: 'JFK', description: 'Origin airport code' })
  origin: string;

  @ApiProperty({ example: 'LHR', description: 'Destination airport code' })
  destination: string;

  @ApiProperty({ example: '2027-05-26T10:00:00Z', description: 'Departure time in ISO format' })
  departureTime: string;

  @ApiProperty({ example: '2027-05-26T22:00:00Z', description: 'Arrival time in ISO format' })
  arrivalTime: string;

  @ApiProperty({ example: 450.50, description: 'Ticket price in USD' })
  price: number;

  @ApiProperty({ example: 250, description: 'Number of available seats' })
  availableSeats: number;
}
