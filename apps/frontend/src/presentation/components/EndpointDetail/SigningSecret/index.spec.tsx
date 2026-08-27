import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SigningSecret, { SigningSecretProps } from '.';

function props(overrides: Partial<SigningSecretProps> = {}): SigningSecretProps {
  return {
    version: 3,
    rotatedAt: '2026-08-27T12:00:00.000Z',
    confirmationOpen: false,
    isRotating: false,
    onRequestRotate: vi.fn(),
    onConfirmRotate: vi.fn(),
    onCancelRotate: vi.fn(),
    ...overrides,
  };
}

describe('SigningSecret', () => {
  it('shows safe metadata and requires confirmation before rotation', () => {
    const value = props();
    const { rerender } = render(<SigningSecret {...value} />);
    expect(screen.getByText('Current version: 3')).toBeInTheDocument();
    expect(screen.getByText(/active delivery runs may continue/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Rotate signing secret' }),
    );
    expect(value.onRequestRotate).toHaveBeenCalledTimes(1);

    const confirming = props({ confirmationOpen: true });
    rerender(<SigningSecret {...confirming} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(/shown only once/i);
    fireEvent.click(screen.getByRole('button', { name: 'Rotate secret' }));
    expect(confirming.onConfirmRotate).toHaveBeenCalledTimes(1);
  });

  it('disables rotation actions while the request is pending', () => {
    render(<SigningSecret {...props({ confirmationOpen: true, isRotating: true })} />);
    const backgroundButton = screen
      .getAllByText('Rotate signing secret')
      .map((element) => element.closest('button'))
      .find(Boolean);
    expect(backgroundButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  });
});
