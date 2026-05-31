import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisBusService } from '../common/redis-bus/redis-bus.service';

@Injectable()
export class PaymentMockService {
  private readonly logger = new Logger(PaymentMockService.name);

  constructor(private redisBus: RedisBusService) { }

  @OnEvent('seat.reserved')
  async processPayment(payload: any) {
    const bookingId = payload.bookingId || payload.id;
    this.logger.log(`Received seat reservation confirmation for Booking ${bookingId}. Processing PCI-DSS token: ${payload.paymentToken}...`);

    // Simulate network delay to payment gateway
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate 80% Success Rate, 20% Failure Rate
    const isSuccess = Math.random() < 0.8;

    if (payload.paymentToken === 'tok_visa') {
      this.logger.log(`Payment Processed Successfully for Booking ${bookingId}.`);
      this.redisBus.publish('payment.successful', { bookingId: bookingId });
    } else {
      this.logger.warn(`Payment FAILED for Booking ${bookingId} (Insufficient Funds). Triggering Saga Rollback...`);
      this.redisBus.publish('payment.failed', { bookingId: bookingId, flightId: payload.flightId });
    }
  }
}
