import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flight' })
  @ApiResponse({ status: 201, description: 'Flight successfully created.' })
  create(@Body() createFlightDto: CreateFlightDto) {
    return this.flightsService.create(createFlightDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled flights (Cached via Redis)' })
  @ApiResponse({ status: 200, description: 'Returns an array of flights.' })
  findAll() {
    return this.flightsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific flight by ID (Cached via Redis)' })
  findOne(@Param('id') id: string) {
    return this.flightsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flight by ID (e.g. status changes)' })
  update(@Param('id') id: string, @Body() updateFlightDto: UpdateFlightDto) {
    return this.flightsService.update(id, updateFlightDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flight by ID' })
  remove(@Param('id') id: string) {
    return this.flightsService.remove(id);
  }
}
