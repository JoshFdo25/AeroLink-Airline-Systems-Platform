import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('passengers')
@Controller('passengers')
export class PassengersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in passenger profile' })
  async getProfile(@Request() req) {
    const passenger = await this.prisma.passenger.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        kycVerified: true,
        createdAt: true,
        // Notice we DO NOT return the encrypted passportNumber for security
      },
    });
    return passenger;
  }
}
