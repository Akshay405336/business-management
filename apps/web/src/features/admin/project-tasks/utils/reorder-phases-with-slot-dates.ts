import type { ProjectTaskBoardPhase } from '../types';

/** Keep timeline slot dates fixed; move phase content (name, tasks) into new order. */
export function reorderBoardPhasesWithSlotDates(
  phases: readonly ProjectTaskBoardPhase[],
  orderedPhaseIds: readonly string[],
): ProjectTaskBoardPhase[] | null {
  const byId = new Map(phases.map((phase) => [phase.id, phase]));
  const slotDates = [...phases]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((phase) => ({
      startDate: phase.startDate,
      expectedEndDate: phase.expectedEndDate,
    }));

  if (slotDates.length !== orderedPhaseIds.length) return null;

  const reordered = orderedPhaseIds.map((id, index) => {
    const phase = byId.get(id);
    const slot = slotDates[index];
    if (!phase || !slot) return null;
    return {
      ...phase,
      sortOrder: index + 1,
      startDate: slot.startDate,
      expectedEndDate: slot.expectedEndDate,
    };
  });

  if (reordered.some((phase) => phase === null)) return null;
  return reordered as ProjectTaskBoardPhase[];
}
