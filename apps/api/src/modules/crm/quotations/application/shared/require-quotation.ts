import { CrmNotFoundError } from '../../../domain/errors/crm.errors.js';
import type { QuotationReadModel } from '../../domain/types/quotation-read-model.js';

export async function requireQuotation(
  promise: Promise<QuotationReadModel | null>,
): Promise<QuotationReadModel> {
  const value = await promise;
  if (!value) throw new CrmNotFoundError('Quotation');
  return value;
}
