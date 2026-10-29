import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatPipelineTaskStartedRange } from './task-actual-date-display.js';

describe('formatPipelineTaskStartedRange', () => {
  it('shows Not yet for TODO', () => {
    assert.equal(
      formatPipelineTaskStartedRange({
        status: 'TODO',
        actualStartedAt: null,
        actualCompletedAt: null,
      }),
      'Not yet',
    );
  });

  it('shows start and Not yet for IN_PROGRESS', () => {
    const line = formatPipelineTaskStartedRange({
      status: 'IN_PROGRESS',
      actualStartedAt: '2026-11-02T10:00:00.000Z',
      actualCompletedAt: null,
    });
    assert.match(line, /– Not yet$/);
  });

  it('shows start and end for COMPLETED', () => {
    const line = formatPipelineTaskStartedRange({
      status: 'COMPLETED',
      actualStartedAt: '2026-11-02T10:00:00.000Z',
      actualCompletedAt: '2026-11-04T10:00:00.000Z',
    });
    assert.match(line, /– \d+\/\d+\/\d+$/);
    assert.doesNotMatch(line, /Completed/i);
  });
});
