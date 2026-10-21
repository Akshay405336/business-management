import { DELIVERY_SERVICES_OPTIONS } from '@techwin/catalog';
import { computeServicePackagePricing, proposalTaxRateFractionToPercentDisplay } from '@techwin/validation';
import type { CrmProposal, CrmServicePackage, ProposalDocumentType } from '../types';

export type ProposalLineItemForm = {
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

export type ProposalFormState = {
  type: ProposalDocumentType;
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
  lineItems: ProposalLineItemForm[];
};

export const UNSELECTED_LINE_SELECTOR = '__unset__';
export const MANUAL_LINE_SELECTOR = '__manual__';

export const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export const emptyLineItem = (): ProposalLineItemForm => ({
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

/** Custom-priced line not tied to a package or catalog entry. */
export const emptyCustomLineItem = (): ProposalLineItemForm => ({
  ...emptyLineItem(),
  selectorKey: MANUAL_LINE_SELECTOR,
});

export const emptyProposalForm = (): ProposalFormState => ({
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
  lineItems: [emptyLineItem()],
});

export const lineSelectorFromProposalItem = (
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

export const proposalToForm = (proposal: CrmProposal): ProposalFormState => ({
  type: proposal.type,
  documentNumber: proposal.documentNumber,
  statusLabel: proposal.status === 'DRAFT' ? 'Draft' : proposal.status,
  clientId: proposal.clientId ?? '',
  clientName: proposal.clientName,
  companyName: proposal.companyName,
  clientPhone: proposal.clientPhone,
  clientEmail: proposal.clientEmail,
  billingAddress: proposal.billingAddress,
  clientGstin: proposal.clientGstin,
  title: proposal.title,
  description: proposal.description,
  scopeOfWork: proposal.scopeOfWork,
  terms: proposal.terms,
  notes: proposal.notes,
  paymentTerms: proposal.paymentTerms,
  deliveryTimeline: proposal.deliveryTimeline,
  issueDate: proposal.issueDate.slice(0, 10),
  lineItems:
    proposal.lineItems.length > 0
      ? proposal.lineItems.map((item) => ({
          key: item.id,
          id: item.id,
          selectorKey: lineSelectorFromProposalItem(item.sourcePackageId, item.name),
          name: item.name,
          category: item.category,
          sourcePackageId: item.sourcePackageId ?? '',
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRatePercent: proposalTaxRateFractionToPercentDisplay(item.taxRate),
        }))
      : [emptyLineItem()],
});

export const applyServicePackageToLine = (pkg: CrmServicePackage): Partial<ProposalLineItemForm> => {
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
