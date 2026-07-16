import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { userAuthReducer } from '@/features/auth/userSlice';
import { Language, localeReducer, setLanguage } from '@/shared/i18n';

interface RenderWithProvidersOptions {
  /** UI language for the rendered tree (doc §10); defaults to Polish. */
  language?: Language;
  route?: string;
}

/**
 * Renders a component with the same providers the app uses: a fresh Redux
 * store (session + locale slices) and a MemoryRouter.
 */
export function renderWithProviders(
  ui: ReactElement,
  { language = 'pl', route = '/' }: RenderWithProvidersOptions = {},
) {
  const store = configureStore({
    reducer: { userAuthStore: userAuthReducer, localeStore: localeReducer },
  });
  store.dispatch(setLanguage(language));

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}
