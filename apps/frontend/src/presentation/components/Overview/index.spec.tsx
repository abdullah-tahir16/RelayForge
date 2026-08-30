import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentActivityItem } from '../../../core/types/DashboardSummary';
import Overview, { OverviewProps } from '.';

const activity: RecentActivityItem = {
  eventId: 'event-1',
  eventType: 'order.completed',
  status: 'FAILED',
  isTest: false,
  createdAt: '2026-08-23T09:00:00Z',
};

function props(overrides: Partial<OverviewProps> = {}): OverviewProps {
  return {
    isLoading: false,
    isError: false,
    inFlightCount: 2,
    needsAttentionCount: 1,
    dlqBacklogCount: 3,
    endpoints: { enabled: 4, disabled: 1 },
    recentActivity: [activity],
    onActivityClick: vi.fn(),
    ...overrides,
  };
}

describe('Overview', () => {
  it('renders delivery health metrics and recent activity', () => {
    render(<Overview {...props()} />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('order.completed')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('navigates to the event on recent-activity row click', () => {
    const value = props();
    render(<Overview {...value} />);

    fireEvent.click(screen.getByText('order.completed'));

    expect(value.onActivityClick).toHaveBeenCalledWith(activity);
  });

  it('marks endpoint-test activity', () => {
    render(
      <Overview
        {...props({
          recentActivity: [
            { ...activity, eventType: 'relayforge.endpoint.test', isTest: true },
          ],
        })}
      />,
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('shows loading, error, and empty recent-activity states', () => {
    const { rerender } = render(<Overview {...props({ isLoading: true })} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    rerender(<Overview {...props({ isError: true })} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be loaded/i);

    rerender(<Overview {...props({ recentActivity: [] })} />);
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });
});
