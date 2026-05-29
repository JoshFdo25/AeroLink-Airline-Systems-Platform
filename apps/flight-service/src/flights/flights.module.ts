import { Module } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';

import { RedisBusService } from '../common/redis-bus/redis-bus.service';
import { FlightGateway } from './flight.gateway';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, RedisBusService, FlightGateway],
})
export class FlightsModule {}
