import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import StickerPicker from './StickerPicker';
import { WishlistOwnerContext } from './wishlistOwner';

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

  it('offers the portrait stickers only once the wishlist owner is known', async () => {
    renderPicker();
    await userEvent.click(screen.getByRole('tab', { name: 'Cyber' }));
    expect(screen.queryByRole('button', { name: 'My caricature' })).not.toBeInTheDocument();
  });

  it('shows the owner portrait stickers and passes their ids up', async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <WishlistOwnerContext.Provider value={6}>
        <StickerPicker onSelect={onSelect} onClose={vi.fn()} />
      </WishlistOwnerContext.Provider>,
      { language: 'en' }
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Cyber' }));
    expect(screen.getByRole('button', { name: 'Me as a child' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'My caricature' }));

    expect(onSelect).toHaveBeenCalledWith('moja-karykatura');
  });

  it('closes on Escape', async () => {
    const { onClose } = renderPicker();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
