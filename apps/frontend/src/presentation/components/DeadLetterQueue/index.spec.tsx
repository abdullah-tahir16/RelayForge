import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DlqItem } from '../../../core/types/Delivery';
import DeadLetterQueue, { DeadLetterQueueProps } from '.';

const item: DlqItem = {
  deliveryId: 'delivery-1', eventId: 'event-1', eventType: 'invoice.created',
  endpointId: 'endpoint-1', endpointName: 'Billing webhook', endpointEnabled: true,
  runId: 'run-1', runNumber: 1, failureReason: 'HTTP_503', httpStatusCode: 503,
  attemptCount: 5, lastAttemptAt: '2026-08-23T10:00:00Z',
  createdAt: '2026-08-23T09:00:00Z', deadLetteredAt: '2026-08-23T10:00:00Z',
};

function props(overrides: Partial<DeadLetterQueueProps> = {}): DeadLetterQueueProps {
  return {
    rows: [item], page: 1, pageSize: 25, total: 1, isLoading: false,
    isError: false, selectedDeliveryId: '', runs: [], attempts: [],
    inspectorLoading: false, inspectorError: false, replayTarget: null,
    disableTarget: null, mutationPending: false, onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(), onInspect: vi.fn(), onReplayRequest: vi.fn(),
    onReplayConfirm: vi.fn(), onDisableRequest: vi.fn(), onDisableConfirm: vi.fn(),
    onCancelAction: vi.fn(), ...overrides,
  };
}

describe('DeadLetterQueue', () => {
  it('renders operational fields and exposes inspect, replay, and disable actions', () => {
    const value = props();
    render(<DeadLetterQueue {...value} />);
    expect(screen.getByRole('heading', { name: 'Dead Letter Queue' })).toBeInTheDocument();
    expect(screen.getByText('invoice.created')).toBeInTheDocument();
    expect(screen.getByText('Billing webhook')).toBeInTheDocument();
    expect(screen.getByText('HTTP_503')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disable endpoint' }));
    expect(value.onInspect).toHaveBeenCalledWith(item);
    expect(value.onReplayRequest).toHaveBeenCalledWith(item);
    expect(value.onDisableRequest).toHaveBeenCalledWith(item);
  });

  it('shows loading, error, empty, and replay confirmation states', () => {
    const { rerender } = render(<DeadLetterQueue {...props({ isLoading: true })} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    rerender(<DeadLetterQueue {...props({ isError: true })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be loaded/i);
    rerender(<DeadLetterQueue {...props({ rows: [], total: 0 })} />);
    expect(screen.getByText(/No deliveries are currently dead-lettered/)).toBeInTheDocument();
    rerender(<DeadLetterQueue {...props({ replayTarget: item })} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(/original event payload/i);
    expect(screen.getByRole('button', { name: 'Replay delivery' })).toBeInTheDocument();
  });
});
