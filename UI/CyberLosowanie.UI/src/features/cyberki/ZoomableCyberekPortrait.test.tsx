import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('./useCyberekImage', () => ({
  useCyberekImage: () => ({ status: 'loaded', src: 'blob:child-portrait' }),
}));

import ZoomableCyberekPortrait from './ZoomableCyberekPortrait';

describe('ZoomableCyberekPortrait', () => {
  it('opens the enlarged photo with its caption and closes it again', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ZoomableCyberekPortrait cyberekId={2} kind="child" alt="Kornelia jako dziecko" caption="Kornelia jako dziecko" />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /powiększ zdjęcie: kornelia jako dziecko/i }));

    const dialog = screen.getByRole('dialog', { name: 'Kornelia jako dziecko' });
    expect(dialog).toBeInTheDocument();
    // The modal hides the page behind it, so only the enlarged photo is exposed.
    expect(within(dialog).getByRole('img', { name: 'Kornelia jako dziecko' })).toHaveAttribute('src', 'blob:child-portrait');

    await user.click(screen.getByRole('button', { name: /zamknij/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
