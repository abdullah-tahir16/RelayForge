import { describe, expect, it } from 'vitest';
import {
  DETAIL_POLL_INTERVAL_MS,
  LIST_POLL_INTERVAL_MS,
  deliveryPollingInterval,
  eventListPollingInterval,
  runHistoryPollingInterval,
  visibleDlqPollingInterval,
} from './polling';
import { Delivery } from '../../core/types/Delivery';
import { EventListItem } from '../../core/types/Event';

const delivery = (status: Delivery['status']): Delivery => ({
  id: 'delivery',
  eventId: 'event',
  endpointId: 'endpoint',
  status,
  attemptCount: 1,
  currentRunId: 'run',
  completedAt: null,
  failedAt: null,
  deadLetteredAt: null,
  httpStatusCode: null,
  durationMs: null,
  nextAttemptAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('DLQ and run polling visibility', () => {
  it('polls the visible DLQ every five seconds and stops in a background tab', () => {
    expect(visibleDlqPollingInterval('visible')).toBe(LIST_POLL_INTERVAL_MS);
    expect(visibleDlqPollingInterval('hidden')).toBe(false);
  });

  it('polls an active run and stops for terminal or hidden data', () => {
    const run = {
      id: 'run',
      deliveryId: 'delivery',
      runNumber: 1,
      trigger: 'INITIAL' as const,
      requestedBy: null,
      status: 'PROCESSING' as const,
      attemptLimit: 5,
      attemptCount: 1,
      initialJobPublishedAt: null,
      dlqPublishedAt: null,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      deadLetteredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(runHistoryPollingInterval([run], true, 'visible')).toBe(
      DETAIL_POLL_INTERVAL_MS,
    );
    expect(
      runHistoryPollingInterval(
        [{ ...run, status: 'DEAD_LETTERED' }],
        true,
        'visible',
      ),
    ).toBe(false);
    expect(runHistoryPollingInterval([run], true, 'hidden')).toBe(false);
  });
});

const event = (status: EventListItem['status']): EventListItem => ({
  id: 'event',
  event: 'order.completed',
  status,
  createdAt: new Date().toISOString(),
  deliveryTotal: 1,
  deliverySucceeded: 0,
});

describe('conditional dashboard polling', () => {
  it('polls active delivery details every two seconds', () => {
    expect(deliveryPollingInterval([delivery('RETRYING')])).toBe(
      DETAIL_POLL_INTERVAL_MS,
    );
  });

  it('stops delivery polling after every row is terminal', () => {
    expect(
      deliveryPollingInterval([
        delivery('SUCCEEDED'),
        delivery('FAILED'),
        delivery('DEAD_LETTERED'),
      ]),
    ).toBe(false);
  });

  it('polls active event lists every five seconds and stops when terminal', () => {
    expect(eventListPollingInterval([event('PROCESSING')])).toBe(
      LIST_POLL_INTERVAL_MS,
    );
    expect(eventListPollingInterval([event('COMPLETED')])).toBe(false);
  });
});
