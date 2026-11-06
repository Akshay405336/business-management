import type { ClientQuotationRecord } from '../../domain/repositories/project.repository.js';

export type ListClientQuotationsResult = {
  readonly quotations: readonly ClientQuotationRecord[];
};
