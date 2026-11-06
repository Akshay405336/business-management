import type {
  CrmLead,
  CrmLeadActivity,
  CrmPipeline,
  CrmPipelineStage,
  CrmServicePackage,
  CatalogSelection,
} from '@techwin/contracts';
import type {
  LeadActivityRecord,
  LeadRecord,
  PipelineRecord,
  PipelineStageRecord,
  ServicePackageRecord,
} from '../../../domain/repositories/crm.repository.js';

const iso = (value: Date): string => value.toISOString();
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const money = (value: string): string => value;
const qty = (value: string): string => value;

export const toCrmPipelineStage = (stage: PipelineStageRecord): CrmPipelineStage => ({
  id: stage.id,
  pipelineId: stage.pipelineId,
  name: stage.name,
  description: stage.description,
  color: stage.color,
  status: stage.status,
  sortOrder: stage.sortOrder,
  outcome: stage.outcome,
  leadCount: stage.leadCount ?? 0,
  createdAt: iso(stage.createdAt),
  updatedAt: iso(stage.updatedAt),
});

export const toCrmPipeline = (pipeline: PipelineRecord): CrmPipeline => ({
  id: pipeline.id,
  name: pipeline.name,
  description: pipeline.description,
  status: pipeline.status,
  isDefault: pipeline.isDefault,
  sortOrder: pipeline.sortOrder,
  leadCount:
    pipeline.leadCount ??
    (pipeline.stages ?? []).reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0),
  createdAt: iso(pipeline.createdAt),
  updatedAt: iso(pipeline.updatedAt),
  stages: (pipeline.stages ?? []).map(toCrmPipelineStage),
});

export const toCrmLead = (lead: LeadRecord): CrmLead => ({
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
  estimatedValue: money(lead.estimatedValue),
  currency: lead.currency,
  expectedCloseDate: lead.expectedCloseDate ? dateOnly(lead.expectedCloseDate) : null,
  nextFollowUpDate: lead.nextFollowUpDate ? iso(lead.nextFollowUpDate) : null,
  description: lead.description,
  tags: lead.tags,
  leadTags: lead.tags.map((name) => ({
    id: name,
    name,
    slug: name.toLowerCase(),
    color: '#64748b',
  })),
  convertedClientId: lead.convertedClientId,
  convertedAt: lead.convertedAt ? iso(lead.convertedAt) : null,
  archivedAt: lead.archivedAt ? iso(lead.archivedAt) : null,
  kanbanSortOrder: lead.kanbanSortOrder,
  lastActivityAt: iso(lead.lastActivityAt),
  createdAt: iso(lead.createdAt),
  updatedAt: iso(lead.updatedAt),
});

export const toCrmLeadActivity = (activity: LeadActivityRecord): CrmLeadActivity => ({
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
});

export { toCrmClient } from '../../../clients/presentation/mappers/client-response.mapper.js';

const asSelections = (value: unknown): readonly CatalogSelection[] =>
  Array.isArray(value) ? (value as CatalogSelection[]) : [];

const asAddOns = (value: unknown): CrmServicePackage['addOns'] =>
  Array.isArray(value)
    ? (
        value as {
          id?: string;
          name: string;
          description?: string;
          price: string;
          gstRatePercent?: string | null;
          taxExempt?: boolean;
          active?: boolean;
        }[]
      ).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        ...(item.description ? { description: item.description } : {}),
        ...(item.gstRatePercent !== undefined ? { gstRatePercent: item.gstRatePercent } : {}),
        ...(item.taxExempt !== undefined ? { taxExempt: item.taxExempt } : {}),
        ...(item.active !== undefined ? { active: item.active } : {}),
      }))
    : [];

export const toCrmServicePackage = (pkg: ServicePackageRecord): CrmServicePackage => ({
  id: pkg.id,
  code: pkg.code,
  name: pkg.name,
  categories: asSelections(pkg.categories),
  shortDescription: pkg.shortDescription,
  detailedDescription: pkg.detailedDescription,
  status: pkg.status,
  technologyStack: asSelections(pkg.technologyStack),
  includedPages: asSelections(pkg.includedPages),
  integrations: asSelections(pkg.integrations),
  adminPanelFeatures: asSelections(pkg.adminPanelFeatures),
  hostingDeployment: asSelections(pkg.hostingDeployment),
  deliveryServices: asSelections(pkg.deliveryServices),
  integrationNotes: pkg.integrationNotes,
  pageCount: pkg.pageCount,
  basePrice: pkg.basePrice,
  addOns: asAddOns(pkg.addOns),
  discountType: pkg.discountType,
  discountValue: pkg.discountValue,
  gstRate: pkg.gstRate,
  taxableAmount: pkg.taxableAmount,
  gstAmount: pkg.gstAmount,
  finalPrice: pkg.finalPrice,
  deliveryDurationValue: pkg.deliveryDurationValue,
  deliveryDurationUnit: pkg.deliveryDurationUnit,
  supportPeriod: pkg.supportPeriod,
  revisionAllowance: pkg.revisionAllowance,
  termsExclusions: pkg.termsExclusions,
  createdAt: iso(pkg.createdAt),
  updatedAt: iso(pkg.updatedAt),
});
