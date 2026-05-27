import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBookingQuery } from '../get-booking.query';
import { PrismaService } from '../../../prisma/prisma.service';

@QueryHandler(GetBookingQuery)
export class GetBookingHandler implements IQueryHandler<GetBookingQuery> {
  constructor(private prisma: PrismaService) {}

  async execute(query: GetBookingQuery) {
    // CQRS Read Model Query (Would be Aurora in Phase 5)
    return this.prisma.booking.findMany({
      where: { passengerId: query.passengerId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
