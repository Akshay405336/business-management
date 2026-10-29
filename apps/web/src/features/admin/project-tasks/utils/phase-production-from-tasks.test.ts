import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPhaseProductionHeaderValue,
  computePhaseProductionFromTasks,
} from './phase-production-from-tasks.js';

const fmt = (iso: string) => iso.slice(0, 10);

describe('formatPhaseProductionHeaderValue', () => {
  it('Case A: all To Do', () => {
    assert.equal(
      formatPhaseProductionHeaderValue(
        [{ status: 'TODO', actualStartedAt: null, actualCompletedAt: null }],
        fmt,
      ),
      'Not yet',
    );
  });

  it('Case B: started but incomplete', () => {
    const line = formatPhaseProductionHeaderValue(
      [
        {
          status: 'IN_PROGRESS',
          actualStartedAt: '2026-11-02T10:00:00.000Z',
          actualCompletedAt: null,
        },
      ],
      fmt,
    );
    assert.equal(line, '2026-11-02 – Not yet');
  });

  it('Case C: all completed', () => {
    const { productionCompletedAt } = computePhaseProductionFromTasks([
      {
        status: 'COMPLETED',
        actualStartedAt: '2026-11-01T10:00:00.000Z',
        actualCompletedAt: '2026-11-03T10:00:00.000Z',
      },
      {
        status: 'COMPLETED',
        actualStartedAt: '2026-11-02T10:00:00.000Z',
        actualCompletedAt: '2026-11-04T10:00:00.000Z',
      },
    ]);
    assert.equal(productionCompletedAt, '2026-11-04T10:00:00.000Z');
  });
});
