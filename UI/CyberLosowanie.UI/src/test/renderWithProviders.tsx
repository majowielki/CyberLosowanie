import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { emptyUserState, setLoggedInUser, userAuthReducer } from '@/features/auth/userSlice';
import type { userModel } from '@/types';
import { Language, localeReducer, setLanguage } from '@/shared/i18n';

interface RenderWithProvidersOptions {
  /** UI language for the rendered tree (doc §10); defaults to Polish. */
  language?: Language;
  route?: string;
  /** History state of the initial entry (what `navigate(path, { state })` would pass). */
  routeState?: unknown;
  /** Signed-in session (merged over an empty one); signed out by default. */
  user?: Partial<userModel>;
}

/**
 * Renders a component with the same providers the app uses: a fresh Redux
 * store (session + locale slices) and a MemoryRouter.
 */
export function renderWithProviders(
  ui: ReactElement,
  { language = 'pl', route = '/', routeState, user }: RenderWithProvidersOptions = {},
) {
  const store = configureStore({
    reducer: { userAuthStore: userAuthReducer, localeStore: localeReducer },
  });
  store.dispatch(setLanguage(language));
  if (user) {
    store.dispatch(setLoggedInUser({ ...emptyUserState, ...user }));
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[routeState === undefined ? route : { pathname: route, state: routeState }]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}
