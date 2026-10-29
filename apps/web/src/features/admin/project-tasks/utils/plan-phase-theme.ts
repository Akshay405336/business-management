/** Pastel Kanban column headers for the project plan board (visual only, by sort order). */
const PLAN_PHASE_THEMES = [
  { accent: '#2563eb', header: '#eff6ff', column: '#f8fafc' },
  { accent: '#9333ea', header: '#f5f3ff', column: '#fafafa' },
  { accent: '#16a34a', header: '#f0fdf4', column: '#fafafa' },
  { accent: '#db2777', header: '#fdf2f8', column: '#fafafa' },
  { accent: '#ea580c', header: '#fff7ed', column: '#fafafa' },
] as const;

export function projectPlanPhaseTheme(sortOrder: number) {
  const index = Math.max(0, sortOrder - 1) % PLAN_PHASE_THEMES.length;
  return PLAN_PHASE_THEMES[index]!;
}
