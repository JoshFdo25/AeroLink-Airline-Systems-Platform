import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-local-jwt-key-for-phase2',
    });
  }

  async validate(payload: any) {
    // This payload is injected into the request object as `req.user`
    return { userId: payload.sub, email: payload.email, role: payload.role, kycVerified: payload.kycVerified };
  }
}
