import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BaggageModule } from './baggage/baggage.module';

@Module({
  imports: [PrismaModule, BaggageModule],
})
export class AppModule {}
