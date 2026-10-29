import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computePhaseProductionFromTasks,
  resolvePhaseProductionSync,
} from './project-phase-production-sync.js';

const t1Start = new Date('2026-11-01T09:00:00.000Z');
const t2Start = new Date('2026-11-02T08:00:00.000Z');
const t1Complete = new Date('2026-11-03T12:00:00.000Z');
const t2Complete = new Date('2026-11-04T18:00:00.000Z');
const phaseCompleted = new Date('2026-11-04T18:00:00.000Z');

describe('computePhaseProductionFromTasks', () => {
  it('Case A: all To Do yields null production timestamps', () => {
    const result = computePhaseProductionFromTasks([
      { status: 'TODO', actualStartedAt: t1Start, actualCompletedAt: null },
    ]);
    assert.equal(result.productionStartedAt, null);
    assert.equal(result.productionCompletedAt, null);
    assert.equal(result.anyProductionStarted, false);
  });

  it('empty stage yields null production timestamps', () => {
    const result = computePhaseProductionFromTasks([]);
    assert.equal(result.productionStartedAt, null);
    assert.equal(result.productionCompletedAt, null);
  });

  it('Case B: uses earliest started task timestamp', () => {
    const result = computePhaseProductionFromTasks([
      { status: 'IN_PROGRESS', actualStartedAt: t2Start, actualCompletedAt: null },
      { status: 'TODO', actualStartedAt: null, actualCompletedAt: null },
      { status: 'COMPLETED', actualStartedAt: t1Start, actualCompletedAt: t1Complete },
    ]);
    assert.equal(result.productionStartedAt?.getTime(), t1Start.getTime());
    assert.equal(result.productionCompletedAt, null);
    assert.equal(result.allCompleted, false);
  });

  it('Case C: uses earliest start and latest completion', () => {
    const result = computePhaseProductionFromTasks([
      {
        status: 'COMPLETED',
        actualStartedAt: t2Start,
        actualCompletedAt: t2Complete,
      },
      {
        status: 'COMPLETED',
        actualStartedAt: t1Start,
        actualCompletedAt: t1Complete,
      },
    ]);
    assert.equal(result.productionStartedAt?.getTime(), t1Start.getTime());
    assert.equal(result.productionCompletedAt?.getTime(), t2Complete.getTime());
    assert.equal(result.allCompleted, true);
  });
});

describe('resolvePhaseProductionSync', () => {
  it('clears stage timestamps for an empty stage', () => {
    const patch = resolvePhaseProductionSync({
      phaseActualStartedAt: t1Start,
      phaseActualCompletedAt: phaseCompleted,
      tasks: [],
    });
    assert.equal(patch.status, 'NOT_STARTED');
    assert.equal(patch.actualStartedAt, null);
    assert.equal(patch.actualCompletedAt, null);
    assert.ok(patch.logStageCompletionWithdrawn);
  });

  it('persists task-derived completion as the latest task completion', () => {
    const patch = resolvePhaseProductionSync({
      phaseActualStartedAt: t1Start,
      phaseActualCompletedAt: null,
      tasks: [
        {
          status: 'COMPLETED',
          actualStartedAt: t1Start,
          actualCompletedAt: t1Complete,
        },
        {
          status: 'COMPLETED',
          actualStartedAt: t2Start,
          actualCompletedAt: t2Complete,
        },
      ],
    });
    assert.equal(patch.status, 'COMPLETED');
    assert.equal(patch.actualCompletedAt?.getTime(), t2Complete.getTime());
    assert.ok(patch.logStageCompleted);
  });

  it('withdraws stage completion when a task is reopened', () => {
    const patch = resolvePhaseProductionSync({
      phaseActualStartedAt: t1Start,
      phaseActualCompletedAt: phaseCompleted,
      tasks: [{ status: 'IN_PROGRESS', actualStartedAt: t1Start, actualCompletedAt: null }],
    });
    assert.equal(patch.status, 'IN_PROGRESS');
    assert.equal(patch.actualCompletedAt, null);
    assert.equal(patch.logStageCompletionWithdrawn?.getTime(), phaseCompleted.getTime());
  });
});
