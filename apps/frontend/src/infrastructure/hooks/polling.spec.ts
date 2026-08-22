import { describe, expect, it } from 'vitest';
import {
  DETAIL_POLL_INTERVAL_MS,
  LIST_POLL_INTERVAL_MS,
  deliveryPollingInterval,
  eventListPollingInterval,
} from './polling';
import { Delivery } from '../../core/types/Delivery';
import { EventListItem } from '../../core/types/Event';

const delivery = (status: Delivery['status']): Delivery => ({
  id: 'delivery',
  eventId: 'event',
  endpointId: 'endpoint',
  status,
  attemptCount: 1,
  completedAt: null,
  failedAt: null,
  httpStatusCode: null,
  durationMs: null,
  nextAttemptAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
      deliveryPollingInterval([delivery('SUCCEEDED'), delivery('FAILED')]),
    ).toBe(false);
  });

  it('polls active event lists every five seconds and stops when terminal', () => {
    expect(eventListPollingInterval([event('PROCESSING')])).toBe(
      LIST_POLL_INTERVAL_MS,
    );
    expect(eventListPollingInterval([event('COMPLETED')])).toBe(false);
  });
});
