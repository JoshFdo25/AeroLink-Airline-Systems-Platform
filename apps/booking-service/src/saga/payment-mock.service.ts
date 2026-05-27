import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';

@Injectable()
export class PaymentMockService {
  private readonly logger = new Logger(PaymentMockService.name);

  constructor(private redisBus: RedisBusService) {}

  @OnEvent('seat.reserved')
  async processPayment(payload: any) {
    this.logger.log(`Received seat reservation confirmation for Booking ${payload.bookingId}. Processing PCI-DSS token: ${payload.paymentToken}...`);
    
    // Simulate network delay to payment gateway
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate 80% Success Rate, 20% Failure Rate
    const isSuccess = Math.random() < 0.8;

    if (isSuccess || payload.paymentToken === 'tok_visa') {
      this.logger.log(`✅ Payment Processed Successfully for Booking ${payload.bookingId}.`);
      this.redisBus.publish('payment.successful', { bookingId: payload.bookingId });
    } else {
      this.logger.warn(`❌ Payment FAILED for Booking ${payload.bookingId} (Insufficient Funds). Triggering Saga Rollback...`);
      this.redisBus.publish('payment.failed', { bookingId: payload.bookingId, flightId: payload.flightId });
    }
  }
}
