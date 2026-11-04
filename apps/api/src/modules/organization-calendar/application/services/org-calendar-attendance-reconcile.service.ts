import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  ORG_CALENDAR_REPOSITORY,
  type OrgCalendarRepository,
} from '../../domain/repositories/org-calendar.repository.js';
import type { OrgCalendarDayKind } from '@techwin/contracts';
import { parseDateOnly } from '../../infrastructure/persistence/prisma/mappers/org-calendar.mapper.js';

function isNonWorkingCalendarKind(dayKind: OrgCalendarDayKind): boolean {
  return (
    dayKind === 'HOLIDAY' ||
    dayKind === 'WEEKLY_OFF' ||
    dayKind === 'NON_WORKING' ||
    dayKind === 'OFFICE_CLOSURE'
  );
}

function attendanceStatusForNonWorking(dayKind: OrgCalendarDayKind): 'HOLIDAY' | 'WEEKLY_OFF' {
  if (dayKind === 'WEEKLY_OFF' || dayKind === 'NON_WORKING') return 'WEEKLY_OFF';
  return 'HOLIDAY';
}

function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let d = parseDateOnly(from); d <= parseDateOnly(to); d.setUTCDate(d.getUTCDate() + 1)) {
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

@Injectable()
export class OrgCalendarAttendanceReconcileService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly orgCalendar: OrgCalendarRepository,
  ) {}

  async reconcileDateRange(organizationId: string, from: string, to: string): Promise<void> {
    const dates = eachDateKey(from, to);
    for (const date of dates) {
      await this.reconcileDate(organizationId, date);
    }
  }

  async reconcileDate(organizationId: string, date: string): Promise<void> {
    const orgDays = await this.orgCalendar.getDaysInRange(organizationId, date, date);
    const dayKind = orgDays[0]?.dayKind ?? 'WORKING';
    const records = await this.prisma.attendanceRecord.findMany({
      where: { organizationId, attendanceDate: parseDateOnly(date) },
      include: { _count: { select: { corrections: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        if (record._count.corrections > 0) continue;

        const hasPunch = Boolean(record.punchInAt);
        const autoAbsent =
          record.status === 'ABSENT' &&
          record.finalizationNote != null &&
          record.finalizationNote.includes('Marked absent after attendance cutoff');

        if (isNonWorkingCalendarKind(dayKind)) {
          const targetStatus = attendanceStatusForNonWorking(dayKind);
          if (!hasPunch && (record.status === 'ABSENT' || autoAbsent)) {
            await tx.attendanceRecord.delete({ where: { id: record.id } });
            continue;
          }
          if (!hasPunch && record.status !== targetStatus) {
            await tx.attendanceRecord.update({
              where: { id: record.id },
              data: {
                status: targetStatus,
                finalizedAt: record.finalizedAt ?? new Date(),
                finalizationNote:
                  record.finalizationNote ??
                  `Aligned to organisation calendar (${targetStatus === 'HOLIDAY' ? 'holiday' : 'weekly off'}).`,
              },
            });
          }
          continue;
        }

        if (!hasPunch && (record.status === 'HOLIDAY' || record.status === 'WEEKLY_OFF')) {
          await tx.attendanceRecord.delete({ where: { id: record.id } });
        }
      }
    });
  }
}
