import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FlightsModule } from './flights/flights.module';

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          url: 'redis://127.0.0.1:6379',
          ttl: 60000,
        }),
      }),
      isGlobal: true,
    }),
    PrismaModule,
    FlightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
