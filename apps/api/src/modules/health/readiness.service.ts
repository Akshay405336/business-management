import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

export type DependencyStatus = 'up' | 'down';

export interface ReadinessReport {
  readonly ready: boolean;
  readonly checks: { readonly database: DependencyStatus; readonly redis: DependencyStatus };
}

const CHECK_TIMEOUT_MS = 2_000;

async function probe(check: () => Promise<void>): Promise<DependencyStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async check(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      probe(() => this.prisma.ping()),
      probe(() => this.redis.ping()),
    ]);
    return { ready: database === 'up' && redis === 'up', checks: { database, redis } };
  }
}
