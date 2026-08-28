import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Endpoint, SigningSecretRotated } from '../../../core/types/Endpoint';
import { Subscription } from '../../../core/types/Subscription';
import EndpointDetail, { EndpointDetailProps } from '.';

const endpoint: Endpoint = {
  id: 'endpoint-1',
  projectId: 'project-1',
  name: 'Billing webhook',
  url: 'https://example.com/webhook',
  description: null,
  enabled: true,
  timeoutMs: 10000,
  signingSecretVersion: 1,
  signingSecretRotatedAt: '2026-08-29T10:00:00.000Z',
  disabledAt: null,
  createdAt: '2026-08-29T10:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
};

function props(
  overrides: Partial<EndpointDetailProps> = {},
): EndpointDetailProps {
  return {
    endpoint,
    subscriptions: [] as Subscription[],
    onSubscribe: vi.fn(),
    onUnsubscribe: vi.fn(),
    rotationConfirmationOpen: false,
    isRotating: false,
    isTesting: false,
    oneTimeSecret: null as SigningSecretRotated | null,
    onTestEndpoint: vi.fn(),
    onRequestRotate: vi.fn(),
    onConfirmRotate: vi.fn(),
    onCancelRotate: vi.fn(),
    onOneTimeSecretAcknowledge: vi.fn(),
    ...overrides,
  };
}

describe('EndpointDetail', () => {
  it('exposes endpoint test delivery action', () => {
    const value = props();
    render(<EndpointDetail {...value} />);

    fireEvent.click(screen.getByRole('button', { name: 'Test delivery' }));

    expect(value.onTestEndpoint).toHaveBeenCalledTimes(1);
  });

  it('disables endpoint test action while pending', () => {
    render(<EndpointDetail {...props({ isTesting: true })} />);

    expect(
      screen.getByRole('button', { name: 'Test delivery' }),
    ).toBeDisabled();
  });
});

