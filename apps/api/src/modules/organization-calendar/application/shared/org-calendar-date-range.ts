export function listDateKeysInclusive(from: string, to: string): string[] {
  const keys: string[] = [];
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}
