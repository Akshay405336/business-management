/** Plan board cards — orange, teal, green, purple only (very light gradients). */
const TASK_CARD_THEMES = [
  {
    top: '#ffedd5',
    bottom: '#fffbf7',
    chip: '#fffcf9',
    accent: '#ea580c',
    ink: '#c2410c',
  },
  {
    top: '#cffafe',
    bottom: '#f8feff',
    chip: '#fcfeff',
    accent: '#0891b2',
    ink: '#0e7490',
  },
  {
    top: '#dcfce7',
    bottom: '#f7fef9',
    chip: '#fbfffc',
    accent: '#22c55e',
    ink: '#15803d',
  },
  {
    top: '#ede9fe',
    bottom: '#faf8ff',
    chip: '#fdfcff',
    accent: '#8b5cf6',
    ink: '#7c3aed',
  },
] as const;

function themeIndexFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % TASK_CARD_THEMES.length;
}

export function projectTaskCardTheme(taskId: string) {
  return TASK_CARD_THEMES[themeIndexFromSeed(taskId)]!;
}

export function projectTaskCardBackground(taskId: string): string {
  const theme = projectTaskCardTheme(taskId);
  return `linear-gradient(180deg, ${theme.top} 0%, ${theme.bottom} 100%)`;
}

/** Light tinted circle for client initials on project summary cards. */
export function projectClientAvatarColors(seed: string): { backgroundColor: string; color: string } {
  const theme = projectTaskCardTheme(seed);
  return { backgroundColor: theme.top, color: theme.ink };
}
