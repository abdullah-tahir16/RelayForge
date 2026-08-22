import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DeliveryAttempts from '.';
import { DeliveryAttempt } from '../../../../core/types/Delivery';

const attempt: DeliveryAttempt = {
  id: 'attempt-1',
  deliveryId: 'delivery-1',
  attemptNumber: 1,
  requestHeaders: { Authorization: '[REDACTED]' },
  responseStatus: 503,
  responseHeaders: { 'set-cookie': '[REDACTED]' },
  responseBodyPreview: 'temporarily unavailable',
  durationMs: 42,
  errorCode: null,
  errorMessage: null,
  startedAt: '2026-08-22T12:00:00.000Z',
  completedAt: '2026-08-22T12:00:00.042Z',
};

describe('DeliveryAttempts', () => {
  it('shows loading, empty, and error states', () => {
    const { rerender } = render(
      <DeliveryAttempts attempts={[]} isLoading isError={false} />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    rerender(<DeliveryAttempts attempts={[]} isLoading={false} isError={false} />);
    expect(screen.getByText(/No attempts/)).toBeInTheDocument();
    rerender(<DeliveryAttempts attempts={[]} isLoading={false} isError />);
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('renders retry diagnostics with wrapping suitable for narrow viewports', () => {
    render(<DeliveryAttempts attempts={[attempt]} isLoading={false} isError={false} />);
    expect(screen.getByText(/Attempt 1 · HTTP 503/)).toBeInTheDocument();
    expect(screen.getByText('temporarily unavailable')).toHaveStyle({
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    });
    expect(screen.getAllByText(/\[REDACTED\]/).length).toBeGreaterThan(0);
  });
});
