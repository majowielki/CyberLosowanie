import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('./cyberLosowanieApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cyberLosowanieApi')>();
  return {
    ...actual,
    useGetMyGiftedCyberekQuery: () => ({ data: { data: { id: 5, name: 'Asia' } }, isLoading: false, error: undefined }),
  };
});

// Portraits come from the API; the reveal logic is what is tested here.
vi.mock('./CyberekPortrait', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));

// jsdom cannot play video, so the film is forced on (or off) explicitly.
const canPlayFilmMock = vi.fn();
vi.mock('@/shared/motion/cinematic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/motion/cinematic')>();
  return { ...actual, canPlayFilm: (...args: unknown[]) => canPlayFilmMock(...args) };
});

import FinalPage from './FinalPage';

const justDrawn = { justDrawn: true, boxRect: null };

describe('FinalPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    canPlayFilmMock.mockReset();
    // A refused autoplay: the page must not wait for the film.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the plain reveal without a film on a later visit (refresh, menu, redirect)', () => {
    canPlayFilmMock.mockReturnValue(true);
    renderWithProviders(<FinalPage />, { route: '/final-page' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Asia/ })).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('skips the film under reduced motion even right after the draw', () => {
    canPlayFilmMock.mockReturnValue(false);
    renderWithProviders(<FinalPage />, { route: '/final-page', routeState: justDrawn });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Asia')).toBeInTheDocument();
  });

  it('plays the film once after the draw, clears the router state and can be skipped', async () => {
    canPlayFilmMock.mockReturnValue(true);
    renderWithProviders(<FinalPage />, { route: '/final-page', routeState: justDrawn });

    expect(screen.getByRole('dialog', { name: 'Otwieranie prezentu' })).toBeInTheDocument();
    // A refresh must not replay it: the state is replaced at once.
    expect(navigateMock).toHaveBeenCalledWith('/final-page', { replace: true, state: null });

    await userEvent.click(screen.getByRole('button', { name: 'Pomiń' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Asia')).toBeInTheDocument();
  });

  it('closes the film on Escape', async () => {
    canPlayFilmMock.mockReturnValue(true);
    renderWithProviders(<FinalPage />, { route: '/final-page', routeState: justDrawn });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
