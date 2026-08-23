import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { invalidateDeliveryReplayQueries } from '../../../infrastructure/hooks/Delivery/useReplayDelivery';
import { NAV_ITEMS } from '../../components/DashboardLayout/consts';
import { replayFailureMessage } from './useDeadLetterQueueFeature';

describe('dead-letter recovery feature helpers', () => {
  it('includes a real DLQ navigation destination', () => {
    expect(NAV_ITEMS).toContainEqual({ label: 'Dead Letter Queue', path: '/dlq' });
  });

  it('explains conflict and resumable publication failures', () => {
    const conflict = new AxiosError('conflict', '409', undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as any,
      data: { message: 'Endpoint is disabled' },
    });
    const unavailable = new AxiosError('unavailable', '503', undefined, undefined, {
      status: 503,
      statusText: 'Unavailable',
      headers: {},
      config: {} as any,
      data: {},
    });
    expect(replayFailureMessage(conflict)).toBe('Endpoint is disabled');
    expect(replayFailureMessage(unavailable)).toMatch(/same run/i);
  });

  it('invalidates DLQ, delivery, run, attempt, and event data after replay', () => {
    const invalidateQueries = vi.fn();
    invalidateDeliveryReplayQueries(
      { invalidateQueries } as unknown as QueryClient,
      'project',
      'delivery',
    );
    expect(invalidateQueries.mock.calls.map((call) => call[0].queryKey)).toEqual([
      ['dlq', 'project'],
      ['deliveries', 'project'],
      ['delivery-runs', 'delivery'],
      ['delivery-attempts', 'delivery'],
      ['events', 'project'],
      ['event'],
    ]);
  });
});
