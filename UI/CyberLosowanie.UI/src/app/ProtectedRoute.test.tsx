import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { userAuthReducer, emptyUserState } from '@/features/auth/userSlice';
import ProtectedRoute from './ProtectedRoute';

const makeStore = (id: string) =>
  configureStore({
    reducer: { userAuthStore: userAuthReducer },
    preloadedState: { userAuthStore: { ...emptyUserState, id } },
  });

const renderWithSession = (id: string, initialPath: string, element: ReactNode) =>
  render(
    <Provider store={makeStore(id)}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={initialPath} element={element} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('ProtectedRoute', () => {
  it('redirects an anonymous user away from a protected route', () => {
    renderWithSession('', '/protected', (
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    ));

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders children for an authenticated user', () => {
    renderWithSession('u1', '/protected', (
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    ));

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('redirects an authenticated user away from an auth-only page', () => {
    renderWithSession('u1', '/login-guard', (
      <ProtectedRoute requireAuth={false}>
        <div>Auth Page</div>
      </ProtectedRoute>
    ));

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Auth Page')).not.toBeInTheDocument();
  });
});
