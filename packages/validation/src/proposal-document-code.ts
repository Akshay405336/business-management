export const QUOTATION_DOCUMENT_PREFIX = 'TECH-QUO';
export const PROPOSAL_DOCUMENT_PREFIX = 'TECH-PRO';

export function formatProposalDocumentNumber(
  type: 'QUOTATION' | 'PROPOSAL',
  sequenceNumber: number,
): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Document sequence number must be a positive integer.');
  }
  const prefix = type === 'QUOTATION' ? QUOTATION_DOCUMENT_PREFIX : PROPOSAL_DOCUMENT_PREFIX;
  return `${prefix}-${String(sequenceNumber).padStart(4, '0')}`;
}
