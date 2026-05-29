import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

@Injectable()
export class RedisBusService implements OnModuleInit, OnModuleDestroy {
  private pubClient: Redis;
  private subClient: Redis;
  private eventBridge: EventBridgeClient;
  private readonly busName = process.env.EVENT_BUS_NAME || 'aerolink-saga-bus';

  constructor(private eventEmitter: EventEmitter2) {
    this.pubClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    this.subClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    this.eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
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
        // Relay Redis events into NestJS internal Event Emitter
        this.eventEmitter.emit(event.type, event.payload);
      }
    });
  }

  onModuleDestroy() {
    this.pubClient.quit();
    this.subClient.quit();
  }

  // Publish a Saga Event out to the distributed Event Bus
  async publish(type: string, payload: any) {
    // 1. AWS EventBridge Publish (The true Cloud-Native way)
    try {
      const command = new PutEventsCommand({
        Entries: [
          {
            EventBusName: this.busName,
            Source: 'aerolink.booking',
            DetailType: type,
            Detail: JSON.stringify(payload),
          },
        ],
      });
      await this.eventBridge.send(command);
    } catch (error) {
      console.error(`[EventBridge] Failed to publish ${type}. Are AWS credentials configured?`, error);
    }

    // 2. Redis Pub/Sub Publish (Local Fallback for inter-process communication during dev)
    this.pubClient.publish('saga_events', JSON.stringify({ type, payload }));
  }
}
