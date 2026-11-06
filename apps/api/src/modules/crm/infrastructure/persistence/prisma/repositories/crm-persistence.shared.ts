import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import type { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { decimalToString } from '../../../services/quotation-money.js';
import type { LeadToClientConversionPort } from '../../../../clients/application/conversion/lead-to-client-conversion.port.js';
import type {
  ClientRecord,
  CrmAuditInput,
  LeadActivityRecord,
  LeadRecord,
  PipelineRecord,
  PipelineStageRecord,
} from '../../../../domain/repositories/crm.repository.js';

export const formatReference = (prefix: string, value: number): string =>
  `${prefix}-${String(value).padStart(6, '0')}`;

export const DEFAULT_PIPELINE_NAME = 'Default Pipeline';

export const pipelineStagesInclude = {
  orderBy: [
    { status: 'asc' },
    { sortOrder: 'asc' },
    { name: 'asc' },
  ] satisfies Prisma.PipelineStageOrderByWithRelationInput[],
  include: { _count: { select: { leads: true } } },
};

export async function nextSequence(
  tx: Pick<PrismaService, 'organizationSequence'>,
  organizationId: string,
  key: string,
): Promise<number> {
  const row = await tx.organizationSequence.upsert({
    where: { organizationId_key: { organizationId, key } },
    create: { organizationId, key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });
  return row.lastValue;
}

export async function writeAudit(
  tx: Pick<PrismaService, 'crmAuditEvent'>,
  organizationId: string,
  audit: CrmAuditInput,
): Promise<void> {
  await tx.crmAuditEvent.create({
    data: {
      organizationId,
      adminId: audit.adminId,
      type: audit.type,
      entityType: audit.entityType,
      entityId: audit.entityId,
      metadata: audit.metadata ?? undefined,
    },
  });
}

export function toPipeline(row: {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: PipelineRecord['status'];
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  stages?: Array<{
    id: string;
    organizationId: string;
    pipelineId: string;
    name: string;
    description: string;
    color: string;
    status: PipelineStageRecord['status'];
    sortOrder: number;
    outcome: PipelineStageRecord['outcome'];
    createdAt: Date;
    updatedAt: Date;
    _count?: { leads: number };
  }>;
  _count?: { leads: number };
}): PipelineRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: row.description,
    status: row.status,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    leadCount: row._count?.leads,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stages: row.stages?.map((stage) => toStage(stage, stage._count?.leads ?? 0)),
  };
}

export function toStage(
  row: {
    id: string;
    organizationId: string;
    pipelineId: string;
    name: string;
    description: string;
    color: string;
    status: PipelineStageRecord['status'];
    sortOrder: number;
    outcome: PipelineStageRecord['outcome'];
    createdAt: Date;
    updatedAt: Date;
  },
  leadCount = 0,
): PipelineStageRecord {
  return { ...row, leadCount };
}

export function toLead(row: {
  id: string;
  organizationId: string;
  referenceNumber: string;
  fullName: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: LeadRecord['source'];
  pipelineId: string;
  stageId: string;
  assignedAdminId: string | null;
  priority: LeadRecord['priority'];
  estimatedValue: Decimal;
  currency: string;
  expectedCloseDate: Date | null;
  nextFollowUpDate: Date | null;
  description: string;
  tags: string[];
  createdByAdminId: string;
  convertedClientId: string | null;
  convertedAt: Date | null;
  convertedByAdminId: string | null;
  archivedAt: Date | null;
  kanbanSortOrder: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): LeadRecord {
  return {
    ...row,
    estimatedValue: decimalToString(row.estimatedValue),
    tags: [...row.tags],
  };
}

export function toActivity(row: {
  id: string;
  organizationId: string;
  leadId: string;
  type: LeadActivityRecord['type'];
  title: string;
  description: string;
  occurredAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  metadata: unknown;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
}): LeadActivityRecord {
  return { ...row };
}

export function toClient(row: {
  id: string;
  organizationId: string;
  referenceNumber: string;
  type: ClientRecord['type'];
  name: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  phoneNormalized: string | null;
  website: string | null;
  billingAddress: string;
  taxRegistration: string;
  status: ClientRecord['status'];
  notes: string;
  sourceLeadId: string | null;
  createdByAdminId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientRecord {
  return { ...row };
}

export async function listStageLeadIds(
  prisma: Pick<PrismaService, 'lead'>,
  organizationId: string,
  stageId: string,
): Promise<string[]> {
  const rows = await prisma.lead.findMany({
    where: { organizationId, stageId, archivedAt: null },
    orderBy: [{ kanbanSortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export function resolveKanbanInsertIndex(
  orderedIds: readonly string[],
  beforeLeadId?: string | null,
): number {
  if (beforeLeadId === undefined || beforeLeadId === null) return orderedIds.length;
  const index = orderedIds.indexOf(beforeLeadId);
  return index < 0 ? orderedIds.length : index;
}

export function sameLeadIdOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export async function nextKanbanSortOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  stageId: string,
): Promise<number> {
  const max = await tx.lead.aggregate({
    where: { organizationId, stageId, archivedAt: null },
    _max: { kanbanSortOrder: true },
  });
  return (max._max.kanbanSortOrder ?? -1) + 1;
}

export async function applyKanbanOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  stageId: string,
  orderedLeadIds: readonly string[],
): Promise<void> {
  await Promise.all(
    orderedLeadIds.map((id, index) =>
      tx.lead.updateMany({
        where: { id, organizationId, stageId },
        data: { kanbanSortOrder: index },
      }),
    ),
  );
}

export type CrmPersistenceHost = {
  readonly prisma: PrismaService;
  readonly leadToClientConversion: LeadToClientConversionPort;
  ensureDefaultPipeline(organizationId: string): Promise<PipelineRecord>;
  getPipeline(organizationId: string, pipelineId: string): Promise<PipelineRecord | null>;
  getLead(organizationId: string, leadId: string): Promise<LeadRecord | null>;
  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null>;
};
