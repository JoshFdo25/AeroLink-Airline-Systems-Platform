import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaggageGateway } from './baggage.gateway';
import { CreateBaggageDto, UpdateBaggageStatusDto } from './dto/baggage.dto';

@Injectable()
export class BaggageService {
  constructor(
    private prisma: PrismaService,
    private baggageGateway: BaggageGateway
  ) {}

  async checkIn(dto: CreateBaggageDto) {
    return this.prisma.baggage.create({
      data: {
        passengerId: dto.passengerId,
        flightId: dto.flightId,
        status: 'CHECKED_IN',
        location: 'Check-in Counter',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateBaggageStatusDto) {
    const bag = await this.prisma.baggage.update({
      where: { id },
      data: {
        status: dto.status,
        location: dto.location,
      },
    });

    if (!bag) throw new NotFoundException('Baggage not found');

    // Instantly push the update to the frontend via WebSockets!
    this.baggageGateway.broadcastBaggageUpdate(bag);

    return bag;
  }

  async getByPassenger(passengerId: string) {
    return this.prisma.baggage.findMany({
      where: { passengerId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findAll() {
    return this.prisma.baggage.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50 // Limit for demo purposes
    });
  }
}
