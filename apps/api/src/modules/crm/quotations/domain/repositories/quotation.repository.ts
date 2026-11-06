import type {
  PaginatedQuotations,
  QuotationPrintReadModel,
  QuotationReadModel,
} from '../types/quotation-read-model.js';
import type {
  CreateQuotationPersistData,
  QuotationAuditEntry,
  QuotationListFilters,
  UpdateQuotationPersistData,
} from '../types/quotation.types.js';
import type { QuotationDocumentType, QuotationStatus } from '../enums/quotation-status.enum.js';

export const QUOTATION_REPOSITORY = Symbol('QUOTATION_REPOSITORY');

export interface QuotationRepository {
  list(organizationId: string, filters: QuotationListFilters): Promise<PaginatedQuotations>;
  previewDocumentNumber(
    organizationId: string,
    type: QuotationDocumentType,
  ): Promise<string>;
  findById(organizationId: string, quotationId: string): Promise<QuotationReadModel | null>;
  create(
    organizationId: string,
    input: CreateQuotationPersistData,
    audit: QuotationAuditEntry,
  ): Promise<QuotationReadModel>;
  update(
    organizationId: string,
    quotationId: string,
    input: UpdateQuotationPersistData,
    audit: QuotationAuditEntry,
  ): Promise<QuotationReadModel>;
  changeStatus(
    organizationId: string,
    quotationId: string,
    toStatus: QuotationStatus,
    note: string,
    adminId: string,
    audit: QuotationAuditEntry,
    fromStatus: QuotationStatus,
    options?: { readonly sentAt?: Date | null },
  ): Promise<QuotationReadModel>;
  expireEligible(
    organizationId: string,
    limit: number,
    now?: Date,
  ): Promise<number>;
  listOrganizationIdsWithExpirableQuotations(now?: Date): Promise<readonly string[]>;
  recordAudit(organizationId: string, audit: QuotationAuditEntry): Promise<void>;
  delete(
    organizationId: string,
    quotationId: string,
    audit: QuotationAuditEntry,
  ): Promise<void>;
  getPrintData(
    organizationId: string,
    quotationId: string,
  ): Promise<QuotationPrintReadModel>;
}
