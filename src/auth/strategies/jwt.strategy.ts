import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { AccessTokenPayload } from '../auth.service';
import { liveSession, RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    if (!payload.sid) {
      throw new UnauthorizedException('Session unknown');
    }

    const alive = await this.refreshTokenRepo.existsBy({
      id: payload.sid,
      ...liveSession(),
    });
    if (!alive) {
      throw new UnauthorizedException('Session revoked');
    }

    return payload;
  }
}
