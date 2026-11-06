import { QuotationValidationError } from '../errors/quotation.errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) {
      throw new QuotationValidationError(`Invalid email address: ${raw.trim()}`);
    }
    if (seen.has(email)) continue;
    seen.add(email);
    result.push(email);
  }
  return result;
}

export function dedupeRecipientFields(input: {
  readonly to: readonly string[];
  readonly cc?: readonly string[];
  readonly bcc?: readonly string[];
}): { readonly to: string[]; readonly cc: string[]; readonly bcc: string[] } {
  const to = normalizeEmailList(input.to);
  if (to.length === 0) {
    throw new QuotationValidationError('At least one recipient is required.');
  }
  const blocked = new Set(to);
  const cc: string[] = [];
  for (const email of normalizeEmailList(input.cc ?? [])) {
    if (blocked.has(email)) continue;
    blocked.add(email);
    cc.push(email);
  }
  const bcc: string[] = [];
  for (const email of normalizeEmailList(input.bcc ?? [])) {
    if (blocked.has(email)) continue;
    blocked.add(email);
    bcc.push(email);
  }
  return { to, cc, bcc };
}
