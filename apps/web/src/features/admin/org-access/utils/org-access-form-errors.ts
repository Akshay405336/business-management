import { API_ERROR_CODES } from '@techwin/contracts';
import { LEAD_EMAIL_INVALID, LEAD_EMAIL_REQUIRED, LEAD_PHONE_INVALID } from '@techwin/validation';
import { isApiError } from '@/shared/api/api-error';
import { describeCrmError } from '@/features/admin/crm/utils/errors';

const UNRECOGNIZED_KEY = /^Unrecognized key: "([^"]+)"/;

export function isOrgAccessSchemaContractError(message: string): boolean {
  return UNRECOGNIZED_KEY.test(message.trim());
}

export const ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR =
  "We couldn't create the account. Please try again.";

const TECHNICAL_PATTERNS = [
  /^Invalid input$/,
  /^Invalid type/,
  /^Expected /,
  /^Required$/,
];

export function orgAccessDetailFieldPath(detail: { path: string; message: string }): string {
  const explicit = detail.path?.trim();
  if (explicit) return explicit;
  const match = UNRECOGNIZED_KEY.exec(detail.message);
  return match?.[1]?.trim() ?? '';
}

/** Maps raw Zod/API validation text to user-facing copy for org-access forms. */
export function humanizeOrgAccessFieldError(field: string, rawMessage: string): string {
  const message = rawMessage.trim();
  if (!message) return message;

  if (isOrgAccessSchemaContractError(message)) {
    return ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR;
  }

  if (field === 'phone') {
    if (message === LEAD_PHONE_INVALID || message.includes('mobile')) {
      return 'Enter a valid phone number.';
    }
  }

  if (field === 'email') {
    if (message === LEAD_EMAIL_REQUIRED) return 'Email is required.';
    if (message === LEAD_EMAIL_INVALID) return 'Enter a valid email address.';
    if (/already.*(email|member|registered)/i.test(message)) {
      return 'An account with this email already exists.';
    }
  }

  if (field === 'displayName') {
    if (/required/i.test(message) || message.includes('min')) {
      return 'Full name is required.';
    }
  }

  if (field === 'password') {
    if (/Password must|upper|lower|digit|symbol|at least/i.test(message)) {
      return "Your password doesn't meet the security requirements shown below.";
    }
  }

  if (field === 'confirmPassword') {
    if (/match/i.test(message)) return 'Passwords do not match.';
  }

  if (field === 'roleIds') {
    if (/permission|cannot assign/i.test(message)) {
      return "You don't have permission to assign this role.";
    }
    if (/invalid.*role|Select at least one role/i.test(message)) {
      return 'Select at least one role you are allowed to assign.';
    }
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(message))) {
    switch (field) {
      case 'email':
        return 'Enter a valid email address.';
      case 'phone':
        return 'Enter a valid phone number.';
      case 'displayName':
        return 'Full name is required.';
      case 'password':
        return "Your password doesn't meet the security requirements shown below.";
      case 'roleIds':
        return 'Select at least one role you are allowed to assign.';
      default:
        return 'Please check this field and try again.';
    }
  }

  return message;
}

export function humanizeOrgAccessFieldErrorMap(
  errors: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [field, message] of Object.entries(errors)) {
    if (!message) continue;
    next[field] = humanizeOrgAccessFieldError(field, message);
  }
  return next;
}

export function describeOrgAccessError(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return 'Unable to connect. Check your connection and try again.';
    }
    if (error.status !== null && error.status >= 500) {
      return "We couldn't complete this request. Please try again.";
    }
    if (error.code === API_ERROR_CODES.FORBIDDEN) {
      if (/role|permission|assign/i.test(error.message)) {
        return "You don't have permission to assign this role.";
      }
      return 'You do not have permission to perform this action.';
    }
    if (/already.*(email|member|registered)/i.test(error.message)) {
      return 'An account with this email already exists.';
    }
    if (error.code === API_ERROR_CODES.VALIDATION_FAILED && error.details.length > 0) {
      const detail = error.details.find((item) => item.message && item.message !== 'Invalid input');
      if (detail) {
        const field = orgAccessDetailFieldPath(detail);
        return humanizeOrgAccessFieldError(field || '_form', detail.message);
      }
      return 'Please fix the highlighted fields and try again.';
    }
    if (error.code === API_ERROR_CODES.INTERNAL_ERROR) {
      return "We couldn't create the account. Please try again.";
    }
  }

  const fallback = describeCrmError(error);
  if (isOrgAccessSchemaContractError(fallback)) {
    return ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR;
  }
  if (fallback === 'The request is invalid.' || fallback === 'Invalid input') {
    return 'Please fix the highlighted fields and try again.';
  }
  return fallback;
}
