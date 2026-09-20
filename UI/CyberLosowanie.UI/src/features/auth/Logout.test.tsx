import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { userAuthReducer, emptyUserState } from '@/features/auth/userSlice';
import { localeReducer } from '@/shared/i18n';

// The persistor is created by the real store module (with redux-persist
// wiring); a stub keeps this test to the Logout component's own behaviour.
const purgeMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/app/store', () => ({ persistor: { purge: () => purgeMock() } }));

import Logout from './Logout';

describe('Logout route', () => {
  beforeEach(() => {
    purgeMock.mockClear();
    localStorage.setItem('token', 'some-token');
  });

  // Logging out is a route so the wishlist editor's navigation blocker can
  // intercept it; the route itself must fully clear the session and go home.
  it('clears the token and session state, then redirects home', async () => {
    const store = configureStore({
      reducer: { userAuthStore: userAuthReducer, localeStore: localeReducer },
      preloadedState: { userAuthStore: { ...emptyUserState, id: 'user-1', cyberekId: 3 } },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/logout']}>
          <Routes>
            <Route path="/logout" element={<Logout />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument());
    expect(localStorage.getItem('token')).toBeNull();
    expect(store.getState().userAuthStore.id).toBe('');
    expect(store.getState().userAuthStore.cyberekId).toBeNull();
    expect(purgeMock).toHaveBeenCalled();
  });
});
