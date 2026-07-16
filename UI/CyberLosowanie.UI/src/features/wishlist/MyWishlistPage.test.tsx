import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Language } from '@/shared/i18n';
import type { apiResponseBody, wishlistModel } from '@/types';
import {
  createEmptyCanvasDocument,
  serializeCanvasDocument,
} from './canvas/canvasDocument';

// Konva needs a real canvas, which jsdom lacks — the editor/viewer internals
// are covered by the engine/document tests, here we only assert page states.
vi.mock('./canvas/WishlistEditor', () => ({
  default: () => <div>MOCK_EDITOR</div>,
}));
vi.mock('./canvas/WishlistViewer', () => ({
  default: () => <div>MOCK_VIEWER</div>,
}));

const useGetMyWishlistQueryMock = vi.fn();
vi.mock('./wishlistApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./wishlistApi')>();
  return {
    ...actual,
    useGetMyWishlistQuery: (...args: unknown[]) => useGetMyWishlistQueryMock(...args),
  };
});

import MyWishlistPage from './MyWishlistPage';

type QueryState = {
  data?: apiResponseBody<wishlistModel | null>;
  isLoading: boolean;
  error?: unknown;
};

const setQueryState = (state: QueryState) => useGetMyWishlistQueryMock.mockReturnValue(state);

const renderPage = (language: Language = 'pl') =>
  renderWithProviders(<MyWishlistPage />, { language });

const successBody = (data: wishlistModel | null): apiResponseBody<wishlistModel | null> => ({
  isSuccess: true,
  data,
  message: '',
  errors: [],
  statusCode: 200,
});

describe('MyWishlistPage', () => {
  beforeEach(() => useGetMyWishlistQueryMock.mockReset());

  it('opens the editor straight away when no wishlist is saved yet', () => {
    setQueryState({ isLoading: false, data: successBody(null) });

    renderPage();

    expect(screen.getByText('MOCK_EDITOR')).toBeInTheDocument();
    expect(screen.queryByText('MOCK_VIEWER')).not.toBeInTheDocument();
  });

  it('shows the preview with an edit button for a saved wishlist', async () => {
    setQueryState({
      isLoading: false,
      data: successBody({
        canvasJson: serializeCanvasDocument(createEmptyCanvasDocument()),
        updatedAtUtc: '2026-07-15T10:00:00Z',
      }),
    });

    renderPage();

    expect(screen.getByText('MOCK_VIEWER')).toBeInTheDocument();
    expect(screen.queryByText('MOCK_EDITOR')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /edytuj/i }));

    expect(screen.getByText('MOCK_EDITOR')).toBeInTheDocument();
  });

  it('points the user to cyberek selection on a 409 (no cyberek yet)', () => {
    setQueryState({ isLoading: false, error: { status: 409 } });

    renderPage();

    expect(screen.getByRole('button', { name: /wybierz cyberka/i })).toBeInTheDocument();
    expect(screen.queryByText('MOCK_EDITOR')).not.toBeInTheDocument();
  });

  it('renders the saved view in English when the language is en', () => {
    setQueryState({
      isLoading: false,
      data: successBody({
        canvasJson: serializeCanvasDocument(createEmptyCanvasDocument()),
        updatedAtUtc: '2026-07-15T10:00:00Z',
      }),
    });

    renderPage('en');

    expect(screen.getByRole('heading', { name: 'My wishlist' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });
});
