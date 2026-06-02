import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CognitoAuthGuard } from '../auth/cognito.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('passengers')
@Controller('passengers')
export class PassengersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current logged-in passenger profile' })
  async getProfile(@Request() req) {
    const passenger = await this.prisma.passenger.findUnique({
      where: { email: req.user.email },
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
