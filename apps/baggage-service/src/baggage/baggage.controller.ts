import { Controller, Post, Body, Patch, Param, Get } from '@nestjs/common';
import { BaggageService } from './baggage.service';
import { CreateBaggageDto, UpdateBaggageStatusDto } from './dto/baggage.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('baggage')
@Controller('baggage')
export class BaggageController {
  constructor(private readonly baggageService: BaggageService) {}

  @Post()
  @ApiOperation({ summary: 'Check in a new bag' })
  checkIn(@Body() dto: CreateBaggageDto) {
    return this.baggageService.checkIn(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update baggage status (Triggers WebSocket event)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBaggageStatusDto) {
    return this.baggageService.updateStatus(id, dto);
  }

  @Get('passenger/:id')
  @ApiOperation({ summary: 'Get all baggage for a passenger' })
  getByPassenger(@Param('id') passengerId: string) {
    return this.baggageService.getByPassenger(passengerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all baggage (Admin)' })
  findAll() {
    return this.baggageService.findAll();
  }
}
