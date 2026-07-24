import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly config: ConfigService,
  ) {}

  // Business timezone (BUSINESS_PLAN 4.11) so "3 AM" means local night.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Asia/Tashkent' })
  async cleanup(): Promise<number> {
    const days = Number(
      this.config.get<string>('REFRESH_TOKEN_RETENTION_DAYS', '30'),
    );
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Dead (revoked or expired) AND older than the retention window.
    // Rows younger than the cutoff stay: reuse detection needs recent chains.
    const result = await this.refreshTokenRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .andWhere('(revoked_at IS NOT NULL OR expires_at < now())')
      .execute();

    const deleted = result.affected ?? 0;
    this.logger.log(`Refresh-token cleanup: ${deleted} row(s) deleted`);
    return deleted;
  }
}
