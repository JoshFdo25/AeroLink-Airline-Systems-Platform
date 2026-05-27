import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RedisBusService implements OnModuleInit, OnModuleDestroy {
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private eventEmitter: EventEmitter2) {
    this.pubClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    this.subClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  }

  onModuleInit() {
    this.subClient.on('ready', () => {
      this.subClient.subscribe('saga_events', (err, count) => {
        if (err) console.error('Failed to subscribe to saga_events: %s', err.message);
      });
    });

    this.subClient.on('message', (channel, message) => {
      if (channel === 'saga_events') {
        const event = JSON.parse(message);
        this.eventEmitter.emit(event.type, event.payload);
      }
    });
  }

  onModuleDestroy() {
    this.pubClient.quit();
    this.subClient.quit();
  }

  publish(type: string, payload: any) {
    this.pubClient.publish('saga_events', JSON.stringify({ type, payload }));
  }
}
