import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTaskProductionActiveStatus,
  resolveTaskActualTimesOnCreate,
  resolveTaskActualTimesOnStatusChange,
} from './project-task-actual-times.js';

const now = new Date('2026-11-02T10:30:00.000Z');
const started = new Date('2026-11-02T08:00:00.000Z');
const completed = new Date('2026-11-04T16:00:00.000Z');

describe('resolveTaskActualTimesOnStatusChange', () => {
  it('returns null when status unchanged', () => {
    assert.equal(
      resolveTaskActualTimesOnStatusChange({
        previousStatus: 'IN_PROGRESS',
        nextStatus: 'IN_PROGRESS',
        actualStartedAt: started,
        actualCompletedAt: null,
        now,
      }),
      null,
    );
  });

  it('TODO to IN_PROGRESS records start only', () => {
    const patch = resolveTaskActualTimesOnStatusChange({
      previousStatus: 'TODO',
      nextStatus: 'IN_PROGRESS',
      actualStartedAt: null,
      actualCompletedAt: null,
      now,
    });
    assert.deepEqual(patch, { actualStartedAt: now });
  });

  it('TODO to COMPLETED records both timestamps', () => {
    const patch = resolveTaskActualTimesOnStatusChange({
      previousStatus: 'TODO',
      nextStatus: 'COMPLETED',
      actualStartedAt: null,
      actualCompletedAt: null,
      now,
    });
    assert.deepEqual(patch, { actualStartedAt: now, actualCompletedAt: now });
  });

  it('IN_PROGRESS to COMPLETED preserves start and records completion', () => {
    const patch = resolveTaskActualTimesOnStatusChange({
      previousStatus: 'IN_PROGRESS',
      nextStatus: 'COMPLETED',
      actualStartedAt: started,
      actualCompletedAt: null,
      now,
    });
    assert.deepEqual(patch, { actualCompletedAt: now });
  });

  it('COMPLETED to IN_PROGRESS clears completion only', () => {
    const patch = resolveTaskActualTimesOnStatusChange({
      previousStatus: 'COMPLETED',
      nextStatus: 'IN_PROGRESS',
      actualStartedAt: started,
      actualCompletedAt: completed,
      now,
    });
    assert.deepEqual(patch, { actualCompletedAt: null });
  });

  it('does not reset start on repeat IN_PROGRESS update', () => {
    assert.equal(
      resolveTaskActualTimesOnStatusChange({
        previousStatus: 'IN_PROGRESS',
        nextStatus: 'IN_REVIEW',
        actualStartedAt: started,
        actualCompletedAt: null,
        now,
      }),
      null,
    );
  });
});

describe('resolveTaskActualTimesOnCreate', () => {
  it('TODO create has no actual times', () => {
    assert.deepEqual(resolveTaskActualTimesOnCreate({ status: 'TODO', now }), {});
  });

  it('COMPLETED create sets both instants', () => {
    assert.deepEqual(resolveTaskActualTimesOnCreate({ status: 'COMPLETED', now }), {
      actualStartedAt: now,
      actualCompletedAt: now,
    });
  });
});

describe('isTaskProductionActiveStatus', () => {
  it('treats IN_REVIEW as active', () => {
    assert.equal(isTaskProductionActiveStatus('IN_REVIEW'), true);
  });
});
