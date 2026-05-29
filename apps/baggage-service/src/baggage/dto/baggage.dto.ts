import { ApiProperty } from '@nestjs/swagger';

export class CreateBaggageDto {
  @ApiProperty({ example: 'pass-123' })
  passengerId!: string;

  @ApiProperty({ example: 'flight-123' })
  flightId!: string;
}

export class UpdateBaggageStatusDto {
  @ApiProperty({ example: 'LOADED', enum: ['CHECKED_IN', 'LOADED', 'IN_TRANSIT', 'READY_FOR_PICKUP', 'CLAIMED'] })
  status!: any;

  @ApiProperty({ example: 'Aircraft Hold 4B' })
  location!: string;
}
