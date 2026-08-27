import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OneTimeSecretDialog from '.';

describe('OneTimeSecretDialog', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('copies the secret and closes only through explicit acknowledgement', async () => {
    const onAcknowledge = vi.fn();
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <OneTimeSecretDialog
        open
        secret="rfs_one_time_secret"
        version={2}
        rotatedAt="2026-08-27T12:00:00.000Z"
        onAcknowledge={onAcknowledge}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(/shown once/i);
    expect(screen.getByLabelText('Signing secret')).toHaveTextContent(
      'rfs_one_time_secret',
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onAcknowledge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Copy signing secret' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('rfs_one_time_secret'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
    expect(localStorageSpy).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'I’ve saved this secret' }),
    );
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    localStorageSpy.mockRestore();
  });

  it('provides a manual-copy recovery message when clipboard access fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(
      <OneTimeSecretDialog
        open
        secret="rfs_secret"
        version={1}
        rotatedAt="2026-08-27T12:00:00.000Z"
        onAcknowledge={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy signing secret' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /select the secret and copy it manually/i,
    );
  });
});
