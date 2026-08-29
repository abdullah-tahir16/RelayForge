import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from '.';

vi.mock('../../containers/ProjectSwitcher', () => ({
  default: () => <label>Project<select><option>Core</option></select></label>,
}));

describe('DashboardLayout', () => {
  it('keeps navigation, project context, and main content reachable', () => {
    render(
      <MemoryRouter initialEntries={['/events']}>
        <DashboardLayout>
          <h1>Events</h1>
        </DashboardLayout>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Events');
    expect(screen.getByText('Skip to main content')).toHaveAttribute(
      'href',
      '#main-content',
    );

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }));

    expect(
      screen.getByRole('navigation', { name: /primary dashboard navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /events/i })).toHaveAttribute(
      'href',
      '/events',
    );
  });
});
