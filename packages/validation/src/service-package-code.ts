/** Fixed package code prefix for all new service packages. */
export const SERVICE_PACKAGE_CODE_PREFIX = 'TECH-PKG';

/** OrganizationSequence key (per org); never decremented on package delete. */
export const SERVICE_PACKAGE_CODE_SEQUENCE_KEY = 'service_package_code:TECH-PKG';

/** TECH-PKG-0001 … TECH-PKG-9999 … TECH-PKG-10000 (minimum four digit suffix when n < 10000). */
export function formatServicePackageCode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Service package sequence number must be a positive integer.');
  }
  return `${SERVICE_PACKAGE_CODE_PREFIX}-${String(sequenceNumber).padStart(4, '0')}`;
}

const SERVICE_PACKAGE_CODE_REGEX = /^TECH-PKG-\d{4,}$/;

export function isValidServicePackageCode(code: string): boolean {
  return SERVICE_PACKAGE_CODE_REGEX.test(code.trim().toUpperCase());
}
