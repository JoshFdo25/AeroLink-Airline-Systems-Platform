import { Module } from '@nestjs/common';
import { BaggageController } from './baggage.controller';
import { BaggageService } from './baggage.service';
import { BaggageGateway } from './baggage.gateway';

@Module({
  controllers: [BaggageController],
  providers: [BaggageService, BaggageGateway],
})
export class BaggageModule {}
