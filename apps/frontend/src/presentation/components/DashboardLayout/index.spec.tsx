import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardLayout from '.';

vi.mock('../../containers/ProjectSwitcher', () => ({
  default: () => <label>Project<select><option>Core</option></select></label>,
}));

const NAV_LABELS = ['Overview', 'Events', 'Dead Letter Queue', 'Endpoints'];

function mockViewport(isDesktop: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return () => {
    window.matchMedia = original;
  };
}

describe('DashboardLayout', () => {
  it('keeps navigation, project context, and main content reachable', () => {
    const restore = mockViewport(false);
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

    restore();
  });

  it('shows every navigation destination with a full visible label on narrow viewports', () => {
    const restore = mockViewport(false);
    render(
      <MemoryRouter initialEntries={['/events']}>
        <DashboardLayout>
          <h1>Events content</h1>
        </DashboardLayout>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }));

    for (const label of NAV_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    restore();
  });

  it('shows every navigation destination with a full visible label on desktop viewports too', () => {
    const restore = mockViewport(true);
    render(
      <MemoryRouter initialEntries={['/events']}>
        <DashboardLayout>
          <h1>Events content</h1>
        </DashboardLayout>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('button', { name: /open navigation/i }),
    ).not.toBeInTheDocument();

    for (const label of NAV_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    restore();
  });
});
