'use client';

import { useMemo } from 'react';
import type { ProjectTask, ProjectTaskBoardPhase } from '../types';
import { ProjectTaskKanbanCardReadOnly } from './project-task-kanban-card-read-only';
import { ProjectTaskPhaseColumn } from './project-task-phase-column';

export function ProjectPlanReadOnlyBoard({
  phases,
  tasks,
}: {
  phases: readonly ProjectTaskBoardPhase[];
  tasks: readonly ProjectTask[];
}) {
  const tasksByPhase = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const phase of phases) {
      map.set(phase.id, []);
    }
    for (const task of tasks) {
      const bucket = map.get(task.phaseId);
      if (bucket) bucket.push(task);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [phases, tasks]);

  if (phases.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        This project has no phases yet.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Project plan phases"
      className="flex min-h-[min(28rem,100%)] min-w-min items-stretch gap-3 px-1 pb-2"
    >
      {phases.map((phase) => {
        const phaseTasks = tasksByPhase.get(phase.id) ?? [];
        return (
          <ProjectTaskPhaseColumn key={phase.id} phase={phase}>
            {phaseTasks.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">No tasks in this phase.</p>
            ) : (
              phaseTasks.map((task) => (
                <ProjectTaskKanbanCardReadOnly key={task.id} task={task} />
              ))
            )}
          </ProjectTaskPhaseColumn>
        );
      })}
    </div>
  );
}
