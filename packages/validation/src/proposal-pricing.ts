export {
  type QuotationLinePricingInput as ProposalLinePricingInput,
  type QuotationLinePricingTotals as ProposalLinePricingTotals,
  type QuotationSummaryTotals as ProposalSummaryTotals,
  normalizeQuotationTaxRateFraction as normalizeProposalTaxRateFraction,
  computeQuotationLinePricing as computeProposalLinePricing,
  computeQuotationSummaryTotals as computeProposalSummaryTotals,
  quotationTaxRateFractionToPercentDisplay as proposalTaxRateFractionToPercentDisplay,
} from './quotation-pricing.js';
