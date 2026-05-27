import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private prisma: PrismaService) { }

  @OnEvent('kyc.requested')
  async handleKycRequestedEvent(payload: { passengerId: string; passportNumber: string }) {
    this.logger.log(`Received KYC verification request for passenger: ${payload.passengerId}`);

    // Simulate 3rd party API network latency (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Simple mock validation logic
    // In real life, this would call Onfido, Jumio, or a government DB
    const isValidLength = payload.passportNumber.length >= 8;
    const isWatchlisted = payload.passportNumber.toUpperCase().startsWith('FAIL');

    if (isValidLength && !isWatchlisted) {
      this.logger.log(`KYC Passed for passenger: ${payload.passengerId}. Updating database asynchronously.`);
      await this.prisma.passenger.update({
        where: { id: payload.passengerId },
        data: { kycVerified: true },
      });
    } else {
      this.logger.warn(`KYC Failed for passenger: ${payload.passengerId} (Fraud or invalid ID).`);
      // In a real saga, we might lock their account or notify them
      await this.prisma.passenger.update({
        where: { id: payload.passengerId },
        data: { kycVerified: false },
      });
    }
  }
}
