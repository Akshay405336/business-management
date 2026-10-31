/** Digits of an international phone number (no `+`), as WhatsApp uses for `wa_id`. */
export function normalizeWhatsAppNumber(raw: string): string | null {
  let value = raw.trim();
  if (value.startsWith('00')) value = value.slice(2);
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith('0')) return null;
  return digits;
}

export function toE164(digits: string): string {
  return `+${digits}`;
}

/** Trailing national-number digits used to match CRM phones stored without a country code. */
export const CRM_PHONE_MATCH_DIGITS = 10;

export function crmPhoneMatchKey(digits: string): string | null {
  const only = digits.replace(/\D/g, '');
  if (only.length < CRM_PHONE_MATCH_DIGITS) return null;
  return only.slice(-CRM_PHONE_MATCH_DIGITS);
}
