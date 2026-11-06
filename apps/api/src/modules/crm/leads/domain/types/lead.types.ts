import type { CrmAuditInput } from '../../../domain/repositories/crm.repository.js';
import type { LeadActivityType } from '../enums/lead-activity-type.enum.js';
import type { LeadPriority } from '../enums/lead-priority.enum.js';
import type { LeadSource } from '../enums/lead-source.enum.js';

export type LeadAuditEntry = CrmAuditInput & { readonly entityType: 'lead' };

export type CreateLeadData = {
  readonly fullName: string;
  readonly companyName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly source?: LeadSource;
  readonly pipelineId: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string | null;
  readonly priority?: LeadPriority;
  readonly estimatedValue?: string | number;
  readonly currency?: string;
  readonly expectedCloseDate?: Date | null;
  readonly nextFollowUpDate?: Date | null;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly tagIds?: readonly string[];
  readonly createdByAdminId: string;
};

export type UpdateLeadData = {
  readonly fullName?: string;
  readonly companyName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly website?: string | null;
  readonly source?: LeadSource;
  readonly pipelineId?: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string | null;
  readonly priority?: LeadPriority;
  readonly estimatedValue?: string | number;
  readonly currency?: string;
  readonly expectedCloseDate?: Date | null;
  readonly nextFollowUpDate?: Date | null;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly tagIds?: readonly string[];
  readonly archivedAt?: Date | null;
};

export type CreateLeadActivityData = {
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description?: string;
  readonly occurredAt: Date;
  readonly dueAt?: Date | null;
  readonly completedAt?: Date | null;
  readonly metadata?: unknown;
  readonly createdByAdminId: string;
};

export type LeadListFilters = {
  readonly search?: string;
  readonly pipelineId?: string;
  readonly stageId?: string;
  readonly assignedAdminId?: string;
  readonly priority?: LeadPriority;
  readonly source?: LeadSource;
  readonly tagIds?: readonly string[];
  readonly includeArchived?: boolean;
  readonly kanbanOrder?: boolean;
  readonly page: number;
  readonly pageSize: number;
};

export type PaginatedLeads = {
  readonly items: readonly import('../entities/lead.entity.js').Lead[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};
