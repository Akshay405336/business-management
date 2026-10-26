import { normalizeIndianMobileInput } from '@techwin/validation';

/** Matches persisted CRM lead phones (Indian mobile validation). */
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

/** Country calling code applied when normalizing stored 10-digit Indian mobiles for WhatsApp. */
export const LEAD_PHONE_COUNTRY_CODE = '91';

export function leadPhoneDisplayValue(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export function buildLeadWhatsAppUrl(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  const normalized = normalizeIndianMobileInput(trimmed);
  if (!INDIAN_MOBILE_PATTERN.test(normalized)) return null;
  return `https://wa.me/${LEAD_PHONE_COUNTRY_CODE}${normalized}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function leadEmailDisplayValue(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function buildLeadMailtoUrl(email: string | null | undefined): string | null {
  const display = leadEmailDisplayValue(email);
  if (!display) return null;
  return `mailto:${encodeURIComponent(display)}`;
}
