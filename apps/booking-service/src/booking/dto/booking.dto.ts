import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'pass-123', description: 'The ID of the logged in passenger' })
  passengerId!: string;

  @ApiProperty({ example: 'flight-123', description: 'The flight to book' })
  flightId!: string;

  @ApiProperty({ example: 'tok_visa', description: 'PCI-DSS Compliant Payment Token' })
  paymentToken!: string;

  @ApiProperty({ example: 299.99 })
  price!: number;
}
