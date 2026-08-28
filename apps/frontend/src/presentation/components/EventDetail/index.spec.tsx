import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Delivery, DeliveryAttempt, DeliveryRun } from '../../../core/types/Delivery';
import { EventDetail as EventDetailType } from '../../../core/types/Event';
import EventDetail, { EventDetailProps } from '.';

const event: EventDetailType = {
  id: 'event-1',
  event: 'relayforge.endpoint.test',
  status: 'PROCESSING',
  createdAt: '2026-08-29T10:00:00.000Z',
  publishedAt: '2026-08-29T10:00:01.000Z',
  payload: { message: 'RelayForge endpoint test delivery' },
  metadata: null,
  isTest: true,
  testTargetEndpointId: 'endpoint-1',
};

const delivery: Delivery = {
  id: 'delivery-1',
  eventId: 'event-1',
  endpointId: 'endpoint-1',
  status: 'PROCESSING',
  attemptCount: 0,
  currentRunId: 'run-1',
  completedAt: null,
  failedAt: null,
  deadLetteredAt: null,
  httpStatusCode: null,
  durationMs: null,
  nextAttemptAt: null,
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  isTest: true,
  testTargetEndpointId: 'endpoint-1',
};

function props(overrides: Partial<EventDetailProps> = {}): EventDetailProps {
  return {
    event,
    deliveries: [delivery],
    isRawView: false,
    onToggleRawView: vi.fn(),
    onCopyPayload: vi.fn(),
    selectedDelivery: null,
    attempts: [] as DeliveryAttempt[],
    runs: [] as DeliveryRun[],
    inspectorLoading: false,
    inspectorError: false,
    onInspectDelivery: vi.fn(),
    replayDeliveryTarget: null,
    eventReplayOpen: false,
    replayPending: false,
    onReplayDeliveryRequest: vi.fn(),
    onReplayEventRequest: vi.fn(),
    onConfirmDeliveryReplay: vi.fn(),
    onConfirmEventReplay: vi.fn(),
    onCancelReplay: vi.fn(),
    ...overrides,
  };
}

describe('EventDetail', () => {
  it('marks endpoint-test events and deliveries', () => {
    render(<EventDetail {...props()} />);

    expect(screen.getByText('Test delivery')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
