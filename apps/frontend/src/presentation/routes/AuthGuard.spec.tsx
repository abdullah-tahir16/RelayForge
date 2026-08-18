import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthGuard from './AuthGuard';

const useAuthUseCaseMock = vi.fn();
vi.mock('../../infrastructure/useCases/Auth/useAuthUseCase', () => ({
  useAuthUseCase: () => useAuthUseCaseMock(),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route
          path="/events"
          element={
            <AuthGuard>
              <div>Protected content</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  it('redirects to login when not authenticated', () => {
    useAuthUseCaseMock.mockReturnValue({ isAuthenticated: false });
    renderGuard();
    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuthUseCaseMock.mockReturnValue({ isAuthenticated: true });
    renderGuard();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});
