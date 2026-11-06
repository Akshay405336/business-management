import type { LeadActivityType } from '../enums/lead-activity-type.enum.js';
import type { LeadPriority } from '../enums/lead-priority.enum.js';
import type { LeadSource } from '../enums/lead-source.enum.js';

export type LeadTagSnapshot = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
};

export type LeadReadModel = {
  readonly id: string;
  readonly organizationId: string;
  readonly referenceNumber: string;
  readonly fullName: string;
  readonly companyName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly source: LeadSource;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly assignedAdminId: string | null;
  readonly priority: LeadPriority;
  readonly estimatedValue: string;
  readonly currency: string;
  readonly expectedCloseDate: Date | null;
  readonly nextFollowUpDate: Date | null;
  readonly description: string;
  readonly tags: readonly string[];
  readonly leadTags: readonly LeadTagSnapshot[];
  readonly createdByAdminId: string;
  readonly convertedClientId: string | null;
  readonly convertedAt: Date | null;
  readonly convertedByAdminId: string | null;
  readonly archivedAt: Date | null;
  readonly kanbanSortOrder: number;
  readonly lastActivityAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type LeadActivityReadModel = {
  readonly id: string;
  readonly organizationId: string;
  readonly leadId: string;
  readonly type: LeadActivityType;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: Date;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
  readonly metadata: unknown;
  readonly createdByAdminId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
