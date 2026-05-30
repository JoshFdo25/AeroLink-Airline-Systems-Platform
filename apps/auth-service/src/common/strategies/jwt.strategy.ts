import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      // In production, this would use Cognito JWKS. For dev/mock, we allow any mock secret.
      secretOrKey: process.env.JWT_SECRET || 'fallback_mock_secret',
    });
  }

  async validate(payload: any, req: any) {
    // If we're using the mock flow, the token might just be 'MOCK_AWS_ACCESS_TOKEN'
    // But passport-jwt expects a valid JWT. If it fails, it throws before reaching here.
    // So if the token is literally 'MOCK_AWS_ACCESS_TOKEN', passport-jwt will reject it because it's not a JWT.
    return { userId: payload.sub, email: payload.email };
  }
}
