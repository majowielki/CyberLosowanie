import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const asia = { data: { data: { id: 5, name: 'Asia' } }, isFetching: false, error: undefined };
const myGiftedQueryMock = vi.fn();
vi.mock('./cyberLosowanieApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cyberLosowanieApi')>();
  return {
    ...actual,
    useGetMyGiftedCyberekQuery: (...args: unknown[]) => myGiftedQueryMock(...args),
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
    myGiftedQueryMock.mockReset().mockReturnValue(asia);
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

  it('always asks the server again and never shows an older cached result meanwhile', () => {
    canPlayFilmMock.mockReturnValue(false);
    // A cached answer from an earlier request is still around while the fresh one loads.
    myGiftedQueryMock.mockReturnValue({ data: { data: { id: 9, name: 'Karol' } }, isFetching: true, error: undefined });
    renderWithProviders(<FinalPage />, { route: '/final-page' });

    expect(myGiftedQueryMock).toHaveBeenCalledWith(undefined, { refetchOnMountOrArgChange: true });
    expect(screen.queryByText('Karol')).not.toBeInTheDocument();
  });

  it('plays the film only once when the result arrives while it is running', () => {
    canPlayFilmMock.mockReturnValue(true);
    // Slow server: the film starts before the result is in.
    myGiftedQueryMock.mockReturnValue({ data: undefined, isFetching: true, error: undefined });
    const { rerender } = renderWithProviders(<FinalPage />, { route: '/final-page', routeState: justDrawn });
    const video = screen.getByRole('dialog').querySelector('video');
    expect(video).not.toBeNull();

    myGiftedQueryMock.mockReturnValue(asia);
    rerender(<FinalPage />);

    // Same element = the film kept running; a remount would start it over.
    expect(screen.getByRole('dialog').querySelector('video')).toBe(video);
    expect(screen.getByText('Asia')).toBeInTheDocument();
  });

  it('closes the film on Escape', async () => {
    canPlayFilmMock.mockReturnValue(true);
    renderWithProviders(<FinalPage />, { route: '/final-page', routeState: justDrawn });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
