import type { CrmLead, CrmLeadActivity } from '@techwin/contracts';
import type { LeadActivityReadModel, LeadReadModel } from '../../domain/types/lead-read-model.js';

const iso = (value: Date): string => value.toISOString();
const isoDate = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

export function toCrmLeadFromReadModel(lead: LeadReadModel): CrmLead {
  return {
    id: lead.id,
    referenceNumber: lead.referenceNumber,
    fullName: lead.fullName,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    source: lead.source,
    pipelineId: lead.pipelineId,
    stageId: lead.stageId,
    assignedAdminId: lead.assignedAdminId,
    priority: lead.priority,
    estimatedValue: lead.estimatedValue,
    currency: lead.currency,
    expectedCloseDate: isoDate(lead.expectedCloseDate),
    nextFollowUpDate: lead.nextFollowUpDate ? iso(lead.nextFollowUpDate) : null,
    description: lead.description,
    tags: [...lead.tags],
    leadTags: lead.leadTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      status: tag.status,
    })),
    convertedClientId: lead.convertedClientId,
    convertedAt: lead.convertedAt ? iso(lead.convertedAt) : null,
    archivedAt: lead.archivedAt ? iso(lead.archivedAt) : null,
    kanbanSortOrder: lead.kanbanSortOrder,
    lastActivityAt: iso(lead.lastActivityAt),
    createdAt: iso(lead.createdAt),
    updatedAt: iso(lead.updatedAt),
  };
}

export function toCrmLeadActivityFromReadModel(activity: LeadActivityReadModel): CrmLeadActivity {
  return {
    id: activity.id,
    leadId: activity.leadId,
    type: activity.type,
    title: activity.title,
    description: activity.description,
    occurredAt: iso(activity.occurredAt),
    dueAt: activity.dueAt ? iso(activity.dueAt) : null,
    completedAt: activity.completedAt ? iso(activity.completedAt) : null,
    metadata: activity.metadata,
    createdByAdminId: activity.createdByAdminId,
    createdAt: iso(activity.createdAt),
    updatedAt: iso(activity.updatedAt),
  };
}
