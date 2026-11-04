import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { RedisExclusiveLockService } from '../../../../infrastructure/cache/redis-exclusive-lock.service.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';

const TICK_MS = 60_000;
const LOCK_TTL_MS = 120_000;
const LOCK_KEY = 'attendance:jobs';

@Injectable()
export class AttendanceJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceJobRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(RedisExclusiveLockService) private readonly lock: RedisExclusiveLockService,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepository,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
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
        `Attendance job tick failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<void> {
    const now = new Date();
    const organizationIds = await this.attendance.listOrganizationIdsWithSchedules();
    let absentTotal = 0;
    let incompleteTotal = 0;
    for (const organizationId of organizationIds) {
      absentTotal += await this.attendance.processAbsentForOrganization(organizationId, now);
      incompleteTotal += await this.attendance.processIncompleteForOrganization(organizationId, now);
    }
    if (absentTotal > 0 || incompleteTotal > 0) {
      this.logger.log(
        `Attendance jobs processed absent=${absentTotal} incomplete=${incompleteTotal}`,
      );
    }
  }
}
