import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  role: string;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string, userAgent?: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.username = :username', { username })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(user);
    const { token: refreshToken } = await this.issueRefreshToken(
      user,
      userAgent,
    );

    return { accessToken, refreshToken, user: this.toSafeUser(user) };
  }

  async refresh(token: string, userAgent?: string) {
    await this.verifyRefreshToken(token);

    const row = await this.refreshTokenRepo.findOneBy({
      tokenHash: this.sha256(token),
    });
    if (!row) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.revokedAt) {
      // A rotated token came back — assume theft and kill every session.
      await this.revokeAllUserTokens(row.userId);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: row.userId },
      relations: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // New row + old-row revoke must land together, or two tokens stay alive.
    const refreshToken = await this.refreshTokenRepo.manager.transaction(
      async (em) => {
        const { token: newToken, row: newRow } = await this.issueRefreshToken(
          user,
          userAgent,
          em,
        );
        await em.update(RefreshToken, row.id, {
          revokedAt: new Date(),
          replacedById: newRow.id,
        });
        return newToken;
      },
    );

    const accessToken = await this.signAccessToken(user);
    return { accessToken, refreshToken };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordOk) {
      // 400, not 401 — the user IS authenticated; a 401 would trigger
      // client-side forced logout for a simple typo.
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepo.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    });
    await this.revokeAllUserTokens(userId);
  }

  async logout(token: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { tokenHash: this.sha256(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async me(userId: number) {
    const user = await this.userRepo.findOneOrFail({
      where: { id: userId },
      relations: { role: true },
    });
    return this.toSafeUser(user);
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role.name,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.ttl('ACCESS_TOKEN_TTL', '15m'),
    });
  }

  private ttl(key: string, fallback: string): JwtSignOptions['expiresIn'] {
    return this.config.get<string>(
      key,
      fallback,
    ) as JwtSignOptions['expiresIn'];
  }

  private async issueRefreshToken(
    user: User,
    userAgent?: string,
    em: EntityManager = this.refreshTokenRepo.manager,
  ): Promise<{ token: string; row: RefreshToken }> {
    // jti makes every token unique — same-second signs with an identical
    // payload would otherwise produce byte-identical JWTs (same sha256 row).
    const token = await this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.ttl('REFRESH_TOKEN_TTL', '2h'),
      },
    );

    const { exp } = this.jwt.decode<{ exp: number }>(token);

    const row = await em.save(
      em.create(RefreshToken, {
        userId: user.id,
        tokenHash: this.sha256(token),
        expiresAt: new Date(exp * 1000),
        userAgent: userAgent ?? null,
      }),
    );

    return { token, row };
  }

  private async verifyRefreshToken(token: string): Promise<void> {
    try {
      await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Public: the users module calls this on deactivation and password reset.
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    };
  }
}
