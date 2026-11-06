/** @deprecated Use `@/features/crm/quotations/utils/quotation-form` */
export {
  applyServicePackageToLine,
  emptyCustomLineItem,
  emptyLineItem,
  emptyQuotationForm as emptyProposalForm,
  lineSelectorFromQuotationItem as lineSelectorFromProposalItem,
  quotationToForm as proposalToForm,
  MANUAL_LINE_SELECTOR,
  UNSELECTED_LINE_SELECTOR,
  type QuotationFormState as ProposalFormState,
  type QuotationLineItemForm as ProposalLineItemForm,
} from '@/features/crm/quotations/utils/quotation-form';
