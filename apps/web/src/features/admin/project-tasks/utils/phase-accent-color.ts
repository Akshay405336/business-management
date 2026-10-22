/** Stable phase accent palette (by sort order, not status). */
const PROJECT_PHASE_ACCENT_HEX = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#0891b2', // cyan
  '#059669', // emerald
  '#d97706', // amber
  '#e11d48', // rose
] as const;

export function projectPhaseAccentHex(sortOrder: number): string {
  const index = Math.max(0, sortOrder - 1) % PROJECT_PHASE_ACCENT_HEX.length;
  return PROJECT_PHASE_ACCENT_HEX[index]!;
}
