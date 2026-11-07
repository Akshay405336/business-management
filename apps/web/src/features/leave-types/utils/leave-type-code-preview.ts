const LEAVE_TYPE_CODE_MAX_LENGTH = 64;

export function previewLeaveTypeCode(name: string): string {
  const code = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, LEAVE_TYPE_CODE_MAX_LENGTH)
    .replace(/_+$/g, '');
  return code;
}
