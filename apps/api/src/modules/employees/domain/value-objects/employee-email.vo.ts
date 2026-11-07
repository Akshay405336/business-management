/** Canonical lowercase email. Empty input stays empty instead of being invented. */
export class EmployeeEmail {
  static normalize(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase();
  }
}
