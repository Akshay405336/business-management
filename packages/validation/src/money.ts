export const MONEY_PARSE_ERROR = 'Enter a valid monetary amount.' as const;

/** Validates Indian (1,50,000) and Western (10,000 / 1,000,000) comma grouping on the integer part. */
export function isValidMoneyCommaGrouping(intPart: string): boolean {
  if (!intPart.includes(',')) return /^\d+$/.test(intPart);
  const segments = intPart.split(',');
  if (segments.some((segment) => segment.length === 0 || !/^\d+$/.test(segment))) {
    return false;
  }
  const last = segments.at(-1);
  if (!last || last.length !== 3) return false;

  const western = segments.every(
    (segment, index) =>
      index === 0 ? segment.length >= 1 && segment.length <= 3 : segment.length === 3,
  );
  if (western) return true;

  const first = segments[0];
  if (!first || first.length < 1 || first.length > 3) return false;
  for (let index = 1; index < segments.length - 1; index++) {
    if (segments[index]!.length !== 2) return false;
  }
  return true;
}

/** Remove common currency prefixes/symbols so formatted display values parse as amounts. */
export function stripMoneyFormattingPrefix(input: string): string {
  return input.trim().replace(/^[^\d,-]+/, '');
}

export function normalizeMoneyInput(
  input: string,
): { success: true; value: string } | { success: false; error: string } {
  const trimmed = stripMoneyFormattingPrefix(input);
  if (trimmed === '') {
    return { success: true, value: '0' };
  }

  if (trimmed.startsWith('-')) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  const dotIndex = trimmed.indexOf('.');
  if (trimmed.indexOf('.', dotIndex + 1) !== -1) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  const intPart = dotIndex === -1 ? trimmed : trimmed.slice(0, dotIndex);
  const decPart = dotIndex === -1 ? undefined : trimmed.slice(dotIndex + 1);

  if (decPart !== undefined && decPart !== '' && !/^\d{1,2}$/.test(decPart)) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  if (!/^[\d,]+$/.test(intPart)) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  if (!isValidMoneyCommaGrouping(intPart)) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  const digits = intPart.replace(/,/g, '');
  const normalized =
    decPart !== undefined && decPart !== '' ? `${digits}.${decPart}` : digits;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { success: false, error: MONEY_PARSE_ERROR };
  }

  return { success: true, value: normalized };
}
