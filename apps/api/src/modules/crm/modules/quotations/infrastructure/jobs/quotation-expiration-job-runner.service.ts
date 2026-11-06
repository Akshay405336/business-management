import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../../../config/app-config.js';
import { RedisExclusiveLockService } from '../../../../../../infrastructure/cache/redis-exclusive-lock.service.js';
import { ExpireQuotationsHandler } from '../../application/expire/expire-quotations.handler.js';

const LOCK_KEY = 'crm:quotations:expiration';
const LOCK_TTL_MS = 120_000;

@Injectable()
export class QuotationExpirationJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuotationExpirationJobRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisExclusiveLockService) private readonly lock: RedisExclusiveLockService,
    @Inject(ExpireQuotationsHandler) private readonly expireQuotations: ExpireQuotationsHandler,
  ) {}

  onModuleInit(): void {
    if (!this.config.quotations.expirationWorkerEnabled) {
      this.logger.log('Quotation expiration worker disabled.');
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.config.quotations.expirationIntervalMs);
    this.timer.unref();
    this.logger.log(
      `Quotation expiration worker started (interval=${this.config.quotations.expirationIntervalMs}ms).`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.lock.runExclusive(LOCK_KEY, LOCK_TTL_MS, () => this.runOnce());
    } catch (error) {
      this.logger.warn(
        `Quotation expiration tick failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<void> {
    const organizationIds = await this.expireQuotations.listOrganizationIds();
    let total = 0;
    const batch = this.config.quotations.expirationBatchSize;
    for (const organizationId of organizationIds) {
      total += await this.expireQuotations.executeForOrganization(organizationId, batch);
    }
    if (total > 0) {
      this.logger.log(`Expired ${total} quotation(s).`);
    }
  }
}
