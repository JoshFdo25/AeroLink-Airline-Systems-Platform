import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private verifier: any;

  constructor(private prisma: PrismaService) {
    if (process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID && !process.env.COGNITO_USER_POOL_ID.includes('xxxx')) {
      this.verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        tokenUse: "access",
        clientId: process.env.COGNITO_CLIENT_ID,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.split(' ')[1];

    if (token === 'MOCK_AWS_ACCESS_TOKEN') {
      // Allow bypass for local dev before Cognito is fully provisioned
      request.user = { userId: 'mock-user-id', role: 'USER' };
      return true;
    }

    try {
      if (!this.verifier) throw new Error("Cognito verifier not initialized");
      const payload = await this.verifier.verify(token);
      
      // Inject user profile into request based on Cognito username (email)
      const user = await this.prisma.passenger.findUnique({ where: { email: payload.username } });
      if (user) {
         request.user = { userId: user.id, email: user.email, role: user.role, kycVerified: user.kycVerified };
      }
      return true;
    } catch (error) {
      console.error('[CognitoAuthGuard] Verification failed', error);
      throw new UnauthorizedException('Invalid or expired Cognito token');
    }
  }
}
