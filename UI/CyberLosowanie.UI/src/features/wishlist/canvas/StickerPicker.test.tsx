import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import StickerPicker from './StickerPicker';

const renderPicker = () => {
  const props = { onSelect: vi.fn(), onClose: vi.fn() };
  renderWithProviders(<StickerPicker {...props} />, { language: 'en' });
  return props;
};

describe('StickerPicker', () => {
  it('shows one tab per category that has stickers', () => {
    renderPicker();

    const tabs = within(screen.getByRole('tablist', { name: 'Sticker categories' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Lettering',
      'Highlights',
      'To fill in',
      'Christmas',
      'Characters',
      'Frames',
      'Cyber',
    ]);
  });

  it('renders only the stickers of the selected category, from lazy thumbnails', async () => {
    renderPicker();

    await userEvent.click(screen.getByRole('tab', { name: 'Characters' }));

    expect(screen.getByRole('tab', { name: 'Characters' })).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('button', { name: 'Reindeer' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Gift' })).not.toBeInTheDocument();
    for (const image of panel.querySelectorAll('img')) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image.getAttribute('src')).toContain('thumbs');
    }
  });

  it('passes the picked sticker id up', async () => {
    const { onSelect } = renderPicker();

    await userEvent.click(screen.getByRole('tab', { name: 'Frames' }));
    await userEvent.click(screen.getByRole('button', { name: 'Photo frame' }));

    expect(onSelect).toHaveBeenCalledWith('ramka-polaroid');
  });

  it('closes on Escape', async () => {
    const { onClose } = renderPicker();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
