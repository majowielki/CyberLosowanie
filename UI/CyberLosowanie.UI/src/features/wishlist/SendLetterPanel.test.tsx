import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const toastMock = vi.fn();
vi.mock('@/shared/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

const sendMock = vi.fn();
vi.mock('./wishlistApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./wishlistApi')>();
  return { ...actual, useSendMyWishlistMutation: () => [sendMock, { isLoading: false }] };
});

// Motion is on by default in jsdom (no reduced-motion query); tests switch it explicitly.
const isEffectEnabledMock = vi.fn();
vi.mock('@/shared/motion/cinematic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/motion/cinematic')>();
  return { ...actual, isEffectEnabled: (...args: unknown[]) => isEffectEnabledMock(...args) };
});

import SendLetterPanel from './SendLetterPanel';

const draft = { canvasJson: '{}', updatedAtUtc: '2026-12-01T10:00:00Z', sentAtUtc: null, lastNotificationAtUtc: null };
const sentWithChanges = {
  canvasJson: '{}',
  updatedAtUtc: '2026-12-03T10:00:00Z',
  sentAtUtc: '2026-12-01T10:00:00Z',
  lastNotificationAtUtc: '2026-12-01T10:00:00Z',
};

const send = async (openLabel: RegExp) => {
  await userEvent.click(screen.getByRole('button', { name: openLabel }));
  await userEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
};

describe('SendLetterPanel', () => {
  beforeEach(() => {
    toastMock.mockReset();
    sendMock.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
    isEffectEnabledMock.mockReset().mockReturnValue(true);
  });

  it('flies the letter off after the first send, then shows the toast', async () => {
    renderWithProviders(<SendLetterPanel wishlist={draft} />);
    await send(/wyślij list do mikołaja/i);

    const flight = await screen.findByRole('dialog', { name: 'Wysyłanie listu do Mikołaja' });
    expect(flight).toBeInTheDocument();
    // The confirmation dialog is closed before the animation takes over.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Pomiń' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith({ description: 'List wysłany! Mikołaj na pewno go dostanie.' });
  });

  it('only shows the toast under reduced motion', async () => {
    isEffectEnabledMock.mockReturnValue(false);
    renderWithProviders(<SendLetterPanel wishlist={draft} />);
    await send(/wyślij list do mikołaja/i);

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps "tell Santa about changes" short: toast right away, no letter flight', async () => {
    renderWithProviders(<SendLetterPanel wishlist={sentWithChanges} />);
    await send(/powiadom mikołaja o zmianach/i);

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({ description: 'Gotowe — Mikołaj dostanie powiadomienie o zmianach.' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('plays nothing when sending fails', async () => {
    sendMock.mockReturnValue({ unwrap: () => Promise.reject({ status: 500 }) });
    renderWithProviders(<SendLetterPanel wishlist={draft} />);
    await send(/wyślij list do mikołaja/i);

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(screen.queryByRole('dialog', { name: 'Wysyłanie listu do Mikołaja' })).not.toBeInTheDocument();
  });
});
