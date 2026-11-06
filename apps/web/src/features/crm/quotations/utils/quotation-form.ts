import { DELIVERY_SERVICES_OPTIONS } from '@techwin/catalog';
import {
  computeServicePackagePricing,
  quotationTaxRateFractionToPercentDisplay,
} from '@techwin/validation';
import type { CrmServicePackage } from '@/features/crm/service-packages/types/service-package.types';
import type { CrmQuotation, QuotationDocumentType } from '../types/quotation.types';

export type QuotationLineItemForm = {
  key: string;
  id?: string;
  selectorKey: string;
  name: string;
  category: string;
  sourcePackageId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  taxRatePercent: string;
};

export type QuotationFormState = {
  type: QuotationDocumentType;
  documentNumber: string;
  statusLabel: string;
  clientId: string;
  clientName: string;
  companyName: string;
  clientPhone: string;
  clientEmail: string;
  billingAddress: string;
  clientGstin: string;
  title: string;
  description: string;
  scopeOfWork: string;
  terms: string;
  notes: string;
  paymentTerms: string;
  deliveryTimeline: string;
  issueDate: string;
  expiryDate: string;
  lineItems: QuotationLineItemForm[];
};

export const UNSELECTED_LINE_SELECTOR = '__unset__';
export const MANUAL_LINE_SELECTOR = '__manual__';

export const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export const addCalendarDaysIso = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const DEFAULT_QUOTATION_VALIDITY_DAYS = 7;

export const emptyLineItem = (): QuotationLineItemForm => ({
  key: crypto.randomUUID(),
  selectorKey: UNSELECTED_LINE_SELECTOR,
  name: '',
  category: '',
  sourcePackageId: '',
  description: '',
  quantity: '1',
  unit: 'item',
  unitPrice: '0',
  discount: '0',
  taxRatePercent: '',
});

export const emptyCustomLineItem = (): QuotationLineItemForm => ({
  ...emptyLineItem(),
  selectorKey: MANUAL_LINE_SELECTOR,
});

export const emptyQuotationForm = (): QuotationFormState => ({
  type: 'QUOTATION',
  documentNumber: '',
  statusLabel: 'Draft',
  clientId: '',
  clientName: '',
  companyName: '',
  clientPhone: '',
  clientEmail: '',
  billingAddress: '',
  clientGstin: '',
  title: '',
  description: '',
  scopeOfWork: '',
  terms: '',
  notes: '',
  paymentTerms: '',
  deliveryTimeline: '',
  issueDate: todayIsoDate(),
  expiryDate: addCalendarDaysIso(todayIsoDate(), DEFAULT_QUOTATION_VALIDITY_DAYS),
  lineItems: [emptyLineItem()],
});

export const lineSelectorFromQuotationItem = (
  sourcePackageId: string | null,
  name: string,
): string => {
  if (sourcePackageId) return `pkg:${sourcePackageId}`;
  const catalog = DELIVERY_SERVICES_OPTIONS.find(
    (option) => option.label.toLowerCase() === name.trim().toLowerCase(),
  );
  if (catalog) return `cat:${catalog.id}`;
  return MANUAL_LINE_SELECTOR;
};

export const quotationToForm = (quotation: CrmQuotation): QuotationFormState => ({
  type: quotation.type,
  documentNumber: quotation.documentNumber,
  statusLabel: quotation.status === 'DRAFT' ? 'Draft' : quotation.status,
  clientId: quotation.clientId ?? '',
  clientName: quotation.clientName,
  companyName: quotation.companyName,
  clientPhone: quotation.clientPhone,
  clientEmail: quotation.clientEmail,
  billingAddress: quotation.billingAddress,
  clientGstin: quotation.clientGstin,
  title: quotation.title,
  description: quotation.description,
  scopeOfWork: quotation.scopeOfWork,
  terms: quotation.terms,
  notes: quotation.notes,
  paymentTerms: quotation.paymentTerms,
  deliveryTimeline: quotation.deliveryTimeline,
  issueDate: quotation.issueDate.slice(0, 10),
  expiryDate: quotation.expiryDate ? quotation.expiryDate.slice(0, 10) : '',
  lineItems:
    quotation.lineItems.length > 0
      ? quotation.lineItems.map((item) => ({
          key: item.id,
          id: item.id,
          selectorKey: lineSelectorFromQuotationItem(item.sourcePackageId, item.name),
          name: item.name,
          category: item.category,
          sourcePackageId: item.sourcePackageId ?? '',
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRatePercent: quotationTaxRateFractionToPercentDisplay(item.taxRate),
        }))
      : [emptyLineItem()],
});

export const applyServicePackageToLine = (
  pkg: CrmServicePackage,
): Partial<QuotationLineItemForm> => {
  const activeAddOnTotal = pkg.addOns
    .filter((item) => item.active !== false)
    .reduce((sum, item) => sum + Number(item.price || 0), 0);
  const pricing = computeServicePackagePricing({
    basePrice: pkg.basePrice,
    addOns: pkg.addOns.map((item) => ({
      price: item.price,
      active: item.active ?? true,
      taxExempt: item.taxExempt ?? false,
      gstRatePercent: item.gstRatePercent ?? pkg.gstRate,
    })),
    discountType: pkg.discountType,
    discountValue: pkg.discountValue,
    gstRatePercent: pkg.gstRate.trim() === '' || pkg.gstRate === '0' ? null : pkg.gstRate,
  });
  const category = pkg.categories
    .slice(0, 2)
    .map((item) => item.label)
    .join(', ');
  return {
    selectorKey: `pkg:${pkg.id}`,
    name: pkg.name,
    category,
    sourcePackageId: pkg.id,
    description: pkg.shortDescription || pkg.detailedDescription,
    quantity: '1',
    unit: 'package',
    unitPrice: String(Number(pkg.basePrice) + activeAddOnTotal),
    discount: pricing.discountAmount,
    taxRatePercent: pkg.gstRate === '0' ? '' : pkg.gstRate,
  };
};
