import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CredentialThrottlerGuard extends ThrottlerGuard {
  async onModuleInit(): Promise<void> {
    await super.onModuleInit();

    this.throttlers = [
      {
        name: 'credential-burst',
        ttl: 60_000,
        limit: 5,
        blockDuration: 60_000,
      },
      {
        name: 'credential-sustained',
        ttl: 900_000,
        limit: 20,
        blockDuration: 900_000,
      },
    ];
  }

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown-ip';

    const username = (req.body as { username?: unknown } | undefined)?.username;
    if (typeof username === 'string' && username.trim()) {
      return Promise.resolve(`${username.trim().toLowerCase()}:${ip}`);
    }

    const sub = (req.user as { sub?: unknown } | undefined)?.sub;
    if (typeof sub === 'number') {
      return Promise.resolve(`user:${sub}:${ip}`);
    }

    return Promise.resolve(ip);
  }

  protected getErrorMessage(): Promise<string> {
    return Promise.resolve('Too many attempts. Please wait and try again.');
  }
}
