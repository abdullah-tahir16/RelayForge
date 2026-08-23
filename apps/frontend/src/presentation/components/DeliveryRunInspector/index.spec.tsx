import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeliveryAttempt, DeliveryRun } from '../../../core/types/Delivery';
import DeliveryRunInspector from '.';

const runs: DeliveryRun[] = [
  {
    id: 'run-1', deliveryId: 'delivery', runNumber: 1, trigger: 'INITIAL',
    requestedBy: null, status: 'DEAD_LETTERED', attemptLimit: 5,
    attemptCount: 1, initialJobPublishedAt: '2026-08-23T10:00:00Z',
    dlqPublishedAt: '2026-08-23T10:01:00Z', startedAt: '2026-08-23T10:00:00Z',
    completedAt: null, failedAt: '2026-08-23T10:01:00Z',
    deadLetteredAt: '2026-08-23T10:01:00Z', createdAt: '2026-08-23T10:00:00Z',
    updatedAt: '2026-08-23T10:01:00Z',
  },
  {
    id: 'run-2', deliveryId: 'delivery', runNumber: 2, trigger: 'MANUAL',
    requestedBy: { id: 'user', email: 'operator@example.test' }, status: 'PROCESSING',
    attemptLimit: 5, attemptCount: 0, initialJobPublishedAt: '2026-08-23T10:02:00Z',
    dlqPublishedAt: null, startedAt: '2026-08-23T10:02:00Z', completedAt: null,
    failedAt: null, deadLetteredAt: null, createdAt: '2026-08-23T10:02:00Z',
    updatedAt: '2026-08-23T10:02:00Z',
  },
];

const attempts: DeliveryAttempt[] = [{
  id: 'attempt', deliveryId: 'delivery', attemptNumber: 1, runId: 'run-1',
  runNumber: 1, runTrigger: 'INITIAL', runAttemptNumber: 1,
  requestHeaders: null, responseStatus: 503, responseHeaders: null,
  responseBodyPreview: 'bounded', durationMs: 20, errorCode: null,
  errorMessage: null, startedAt: '2026-08-23T10:00:00Z',
  completedAt: '2026-08-23T10:00:00Z',
}];

describe('DeliveryRunInspector', () => {
  it('groups immutable attempts beneath their initial/manual run lineage', () => {
    render(<DeliveryRunInspector runs={runs} attempts={attempts} isLoading={false} isError={false} />);
    expect(screen.getByText(/Run 1 · Initial/)).toBeInTheDocument();
    expect(screen.getByText(/Run 2 · Manual replay/)).toBeInTheDocument();
    expect(screen.getByText(/Run attempt 1 · Global attempt 1/)).toBeInTheDocument();
    expect(screen.getByText(/Requested by operator@example.test/)).toBeInTheDocument();
    expect(screen.getByText(/This run has no attempts yet/)).toBeInTheDocument();
  });
});
