import type { Decimal } from '@prisma/client/runtime/client';
import { Lead } from '../../../../domain/entities/lead.entity.js';
import { parseLeadPriority } from '../../../../domain/enums/lead-priority.enum.js';
import { parseLeadSource } from '../../../../domain/enums/lead-source.enum.js';

export type LeadRow = {
  id: string;
  organizationId: string;
  referenceNumber: string;
  fullName: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string;
  pipelineId: string;
  stageId: string;
  assignedAdminId: string | null;
  priority: string;
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
};

function decimalToString(value: Decimal): string {
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') || '0';
}

export function leadRowToDomain(row: LeadRow): Lead {
  return Lead.reconstitute({
    id: row.id,
    organizationId: row.organizationId,
    referenceNumber: row.referenceNumber,
    fullName: row.fullName,
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    website: row.website,
    source: parseLeadSource(row.source),
    pipelineId: row.pipelineId,
    stageId: row.stageId,
    assignedAdminId: row.assignedAdminId,
    priority: parseLeadPriority(row.priority),
    estimatedValue: decimalToString(row.estimatedValue),
    currency: row.currency,
    expectedCloseDate: row.expectedCloseDate,
    nextFollowUpDate: row.nextFollowUpDate,
    description: row.description,
    tags: [...row.tags],
    createdByAdminId: row.createdByAdminId,
    convertedClientId: row.convertedClientId,
    convertedAt: row.convertedAt,
    convertedByAdminId: row.convertedByAdminId,
    archivedAt: row.archivedAt,
    kanbanSortOrder: row.kanbanSortOrder,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
