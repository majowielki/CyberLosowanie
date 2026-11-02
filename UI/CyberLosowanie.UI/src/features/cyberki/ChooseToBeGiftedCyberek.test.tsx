import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const toastMock = vi.fn();
vi.mock('@/shared/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

const useGetCyberkiQueryMock = vi.fn();
const useGetAvailableGiftTargetsQueryMock = vi.fn();
const useAssignGiftedCyberekMutationMock = vi.fn();
const fetchMyGiftedCyberekMock = vi.fn();
vi.mock('./cyberLosowanieApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cyberLosowanieApi')>();
  return {
    ...actual,
    useGetCyberkiQuery: (...args: unknown[]) => useGetCyberkiQueryMock(...args),
    useGetAvailableGiftTargetsQuery: (...args: unknown[]) => useGetAvailableGiftTargetsQueryMock(...args),
    useAssignGiftedCyberekMutation: (...args: unknown[]) => useAssignGiftedCyberekMutationMock(...args),
    useLazyGetMyGiftedCyberekQuery: () => [fetchMyGiftedCyberekMock],
  };
});

const canPlayFilmMock = vi.fn();
vi.mock('@/shared/motion/cinematic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/motion/cinematic')>();
  return { ...actual, canPlayFilm: (...args: unknown[]) => canPlayFilmMock(...args) };
});

import ChooseToBeGiftedCyberek from './ChooseToBeGiftedCyberek';

const cyberki = [1, 2, 3].map((id) => ({ id, name: `N${id}`, surname: '' }));

describe('ChooseToBeGiftedCyberek', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    // By default the server holds no result for this user yet.
    fetchMyGiftedCyberekMock.mockReset().mockReturnValue({ unwrap: () => Promise.reject({ status: 400 }) });
    useGetCyberkiQueryMock.mockReturnValue({ data: { data: cyberki }, isLoading: false });
    useAssignGiftedCyberekMutationMock.mockReturnValue([vi.fn()]);
    canPlayFilmMock.mockReset().mockReturnValue(true);
    // The tap unlocks the sound; jsdom has no media playback.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  const withTargets = () =>
    useGetAvailableGiftTargetsQueryMock.mockReturnValue({
      data: { data: [1, 2, 3] },
      isLoading: false,
      refetch: vi.fn(),
    });

  it('hands the film to the final page only after a successful draw', async () => {
    withTargets();
    const assign = vi.fn(() => ({ unwrap: () => Promise.resolve({ data: 2 }) }));
    useAssignGiftedCyberekMutationMock.mockReturnValue([assign]);

    renderWithProviders(<ChooseToBeGiftedCyberek />);
    await userEvent.click(screen.getAllByRole('button', { name: /wybierz/i })[1]);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/final-page', {
        state: expect.objectContaining({ justDrawn: true }),
      }),
    );
  });

  it('shows the toast and no film when the box was just taken (409)', async () => {
    withTargets();
    const assign = vi.fn(() => ({ unwrap: () => Promise.reject({ status: 409 }) }));
    useAssignGiftedCyberekMutationMock.mockReturnValue([assign]);

    renderWithProviders(<ChooseToBeGiftedCyberek />);
    await userEvent.click(screen.getAllByRole('button', { name: /wybierz/i })[0]);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(navigateMock).not.toHaveBeenCalled();
    // The board stays (no full-page loading panel) and is usable again.
    expect(screen.getAllByRole('button', { name: /wybierz/i })[0]).toBeEnabled();
  });

  // The answer to the draw can be lost after the server committed it (dropped
  // connection, a retried request), or the account drew in another tab. The
  // page must not guess: it asks the server and shows the result it holds.
  it('shows the server-side result when the draw request fails but a result exists', async () => {
    withTargets();
    const assign = vi.fn(() => ({ unwrap: () => Promise.reject({ status: 'FETCH_ERROR' }) }));
    useAssignGiftedCyberekMutationMock.mockReturnValue([assign]);
    fetchMyGiftedCyberekMock.mockReturnValue({ unwrap: () => Promise.resolve({ data: { id: 3, name: 'N3' } }) });

    const { store } = renderWithProviders(<ChooseToBeGiftedCyberek />, { user: { id: 'u1', cyberekId: 1 } });
    await userEvent.click(screen.getAllByRole('button', { name: /wybierz/i })[0]);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/final-page'));
    // The result comes from the server, not from the clicked box (box 1).
    expect(store.getState().userAuthStore.giftedCyberekId).toBe(3);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('stays on the board with an error when the draw fails and the server holds no result', async () => {
    const refetch = vi.fn();
    useGetAvailableGiftTargetsQueryMock.mockReturnValue({ data: { data: [1, 2, 3] }, isLoading: false, refetch });
    const assign = vi.fn(() => ({ unwrap: () => Promise.reject({ status: 500 }) }));
    useAssignGiftedCyberekMutationMock.mockReturnValue([assign]);

    renderWithProviders(<ChooseToBeGiftedCyberek />);
    await userEvent.click(screen.getAllByRole('button', { name: /wybierz/i })[0]);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(navigateMock).not.toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });

  it('goes to the plain reveal without film state under reduced motion', async () => {
    withTargets();
    canPlayFilmMock.mockReturnValue(false);
    const assign = vi.fn(() => ({ unwrap: () => Promise.resolve({ data: 1 }) }));
    useAssignGiftedCyberekMutationMock.mockReturnValue([assign]);

    renderWithProviders(<ChooseToBeGiftedCyberek />);
    await userEvent.click(screen.getAllByRole('button', { name: /wybierz/i })[0]);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/final-page', undefined));
  });

  it('lets the user pick a box when targets are available', () => {
    useGetAvailableGiftTargetsQueryMock.mockReturnValue({
      data: { data: [1, 2, 3] },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ChooseToBeGiftedCyberek />);

    expect(screen.getAllByRole('button', { name: /wybierz/i })).toHaveLength(3);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  // Regression test (H5): a stale client-side "have I drawn yet?" flag used to
  // route a user who already has a gift assigned back onto this page, where
  // every box showed as taken with no way forward. The backend guarantees
  // GetSafeTargets is never empty for someone who hasn't drawn (Hall's
  // condition), so an empty list here can only mean the flag was wrong — the
  // page must self-heal to the real result instead of stranding the user.
  it('redirects to the final page instead of showing an empty board when already assigned', async () => {
    useGetAvailableGiftTargetsQueryMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<ChooseToBeGiftedCyberek />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/final-page'));
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.any(String) }),
    );
    expect(screen.queryByRole('button', { name: /wybierz/i })).not.toBeInTheDocument();
  });
});
