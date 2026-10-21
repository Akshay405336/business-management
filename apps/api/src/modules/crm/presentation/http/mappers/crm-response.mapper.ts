import type {
  CrmClient,
  CrmLead,
  CrmLeadActivity,
  CrmPipeline,
  CrmPipelineStage,
  CrmProposal,
  CrmProposalLineItem,
  CrmProposalPrintResponse,
  CrmServicePackage,
  CatalogSelection,
} from '@techwin/contracts';
import type {
  ClientRecord,
  LeadActivityRecord,
  LeadRecord,
  PipelineRecord,
  PipelineStageRecord,
  ProposalRecord,
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

export const toCrmClient = (client: ClientRecord): CrmClient => ({
  id: client.id,
  referenceNumber: client.referenceNumber,
  type: client.type,
  name: client.name,
  primaryContact: client.primaryContact,
  email: client.email,
  phone: client.phone,
  website: client.website,
  billingAddress: client.billingAddress,
  taxRegistration: client.taxRegistration,
  status: client.status,
  notes: client.notes,
  sourceLeadId: client.sourceLeadId,
  archivedAt: client.archivedAt ? iso(client.archivedAt) : null,
  createdAt: iso(client.createdAt),
  updatedAt: iso(client.updatedAt),
});

const toCrmProposalLineItem = (
  item: NonNullable<ProposalRecord['lineItems']>[number],
): CrmProposalLineItem => ({
  id: item.id,
  name: item.name,
  category: item.category,
  sourcePackageId: item.sourcePackageId ?? null,
  description: item.description,
  quantity: qty(item.quantity),
  unit: item.unit,
  unitPrice: money(item.unitPrice),
  discount: money(item.discount),
  taxRate: qty(item.taxRate),
  lineTotal: money(item.lineTotal),
  sortOrder: item.sortOrder,
});

export const toCrmProposal = (proposal: ProposalRecord): CrmProposal => ({
  id: proposal.id,
  documentNumber: proposal.documentNumber,
  type: proposal.type,
  status: proposal.status,
  title: proposal.title,
  description: proposal.description,
  leadId: proposal.leadId,
  clientId: proposal.clientId,
  issueDate: dateOnly(proposal.issueDate),
  expiryDate: proposal.expiryDate ? dateOnly(proposal.expiryDate) : null,
  currency: proposal.currency,
  subtotal: money(proposal.subtotal),
  discountTotal: money(proposal.discountTotal),
  taxTotal: money(proposal.taxTotal),
  grandTotal: money(proposal.grandTotal),
  notes: proposal.notes,
  terms: proposal.terms,
  scopeOfWork: proposal.scopeOfWork,
  paymentTerms: proposal.paymentTerms,
  deliveryTimeline: proposal.deliveryTimeline,
  clientName: proposal.clientName,
  companyName: proposal.companyName,
  clientPhone: proposal.clientPhone,
  clientEmail: proposal.clientEmail,
  billingAddress: proposal.billingAddress,
  clientGstin: proposal.clientGstin,
  version: proposal.version,
  sourcePackageId: proposal.sourcePackageId,
  packageSnapshot: (proposal.packageSnapshot as CrmProposal['packageSnapshot']) ?? null,
  lineItems: (proposal.lineItems ?? []).map(toCrmProposalLineItem),
  createdAt: iso(proposal.createdAt),
  updatedAt: iso(proposal.updatedAt),
});

export const toCrmProposalPrint = (
  proposal: ProposalRecord & { organizationName: string },
): CrmProposalPrintResponse => ({
  ...toCrmProposal(proposal),
  organizationName: proposal.organizationName,
});

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
