/** Map daily/project color tokens to hex for CRM kanban column theming. */
const TOKEN_HEX: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  amber: '#f59e0b',
  emerald: '#10b981',
  rose: '#f43f5e',
  violet: '#8b5cf6',
};

export function colorTokenToHex(token: string): string {
  return TOKEN_HEX[token] ?? TOKEN_HEX.slate!;
}
