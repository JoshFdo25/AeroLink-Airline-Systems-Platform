import { Module } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';

import { RedisBusService } from '../common/redis-bus/redis-bus.service';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, RedisBusService],
})
export class FlightsModule {}
