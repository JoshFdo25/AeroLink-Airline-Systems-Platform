import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateFlightDto } from './create-flight.dto';

export class UpdateFlightDto extends PartialType(CreateFlightDto) {
  @ApiProperty({ example: 'DELAYED', description: 'Flight status', required: false })
  status?: string;
}
