import { LeadActivity } from '../../../../domain/entities/lead-activity.entity.js';
import { parseLeadActivityType } from '../../../../domain/enums/lead-activity-type.enum.js';

export type LeadActivityRow = {
  id: string;
  organizationId: string;
  leadId: string;
  type: string;
  title: string;
  description: string;
  occurredAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  metadata: unknown;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
};

export function leadActivityRowToDomain(row: LeadActivityRow): LeadActivity {
  return LeadActivity.reconstitute({
    id: row.id,
    organizationId: row.organizationId,
    leadId: row.leadId,
    type: parseLeadActivityType(row.type),
    title: row.title,
    description: row.description,
    occurredAt: row.occurredAt,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    metadata: row.metadata,
    createdByAdminId: row.createdByAdminId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
