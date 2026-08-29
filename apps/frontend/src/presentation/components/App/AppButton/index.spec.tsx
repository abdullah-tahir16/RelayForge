import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppButton from '.';

describe('AppButton', () => {
  it('exposes pending state accessibly while preserving the label', () => {
    render(<AppButton loading>Save endpoint</AppButton>);

    const button = screen.getByRole('button', { name: /save endpoint/i });
    expect(button).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
