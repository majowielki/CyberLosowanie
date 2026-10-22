import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import CanvasToolbar, { EditorTool } from './CanvasToolbar';

const renderToolbar = (tool: EditorTool, overrides: Partial<React.ComponentProps<typeof CanvasToolbar>> = {}) => {
  const props = {
    tool,
    onToolChange: vi.fn(),
    color: '#111827',
    onColorChange: vi.fn(),
    strokeWidth: 6,
    onStrokeWidthChange: vi.fn(),
    strokeKind: 'pen' as const,
    onStrokeKindChange: vi.fn(),
    shapeKind: 'rect' as const,
    onShapeKindChange: vi.fn(),
    shapeFilled: false,
    onShapeFilledChange: vi.fn(),
    pageBackground: '#ffffff',
    pagePattern: undefined,
    onPagePatternChange: vi.fn(),
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    hasSelection: false,
    onDeleteSelection: vi.fn(),
    onClearAll: vi.fn(),
    onPickImage: vi.fn(),
    onPickEmoji: vi.fn(),
    onPickSticker: vi.fn(),
    isUploadingImage: false,
    textFont: 'caveat' as const,
    onTextFontChange: vi.fn(),
    showSelectionFont: false,
    ...overrides,
  };
  renderWithProviders(<CanvasToolbar {...props} />, { language: 'en' });
  return props;
};

describe('CanvasToolbar flyouts', () => {
  it('offers the text fonts with the text tool, including the plain default', async () => {
    const props = renderToolbar('text');

    await userEvent.click(screen.getByRole('button', { name: 'Font: Caveat' }));
    await userEvent.click(screen.getByRole('button', { name: 'Berkshire Swash' }));
    expect(props.onTextFontChange).toHaveBeenCalledWith('berkshire-swash');

    await userEvent.click(screen.getByRole('button', { name: 'Font: Caveat' }));
    await userEvent.click(screen.getByRole('button', { name: 'Plain' }));
    expect(props.onTextFontChange).toHaveBeenLastCalledWith(undefined);
  });

  it('hides the font picker for drawing tools', () => {
    renderToolbar('pen');
    expect(screen.queryByRole('button', { name: /^Font:/ })).not.toBeInTheDocument();
  });

  it('keeps the palettes collapsed until their trigger is clicked', async () => {
    const props = renderToolbar('pen');

    expect(screen.queryByRole('button', { name: 'Neon' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pen style: Pen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Neon' }));

    expect(props.onStrokeKindChange).toHaveBeenCalledWith('neon');
    // Choosing an option collapses the panel again.
    expect(screen.queryByRole('button', { name: 'Neon' })).not.toBeInTheDocument();
  });

  it('shows the background pattern picker only for the fill tool', async () => {
    const props = renderToolbar('fill');

    expect(screen.queryByRole('button', { name: /pen style/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Background pattern: Plain' }));
    await userEvent.click(screen.getByRole('button', { name: 'Snowflakes' }));

    expect(props.onPagePatternChange).toHaveBeenCalledWith('snowflakes');
  });

  it('names the current values on the triggers', () => {
    renderToolbar('pen', { strokeKind: 'glitter', color: '#e11d48', strokeWidth: 24 });

    expect(screen.getByRole('button', { name: 'Pen style: Glitter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Color: #e11d48' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Line width: 24' })).toBeInTheDocument();
  });
});

describe('CanvasToolbar pen-style preview', () => {
  it('puts white ink on a dark chip so it stays visible on the white toolbar', () => {
    renderToolbar('pen', { color: '#ffffff' });

    const trigger = screen.getByRole('button', { name: 'Pen style: Pen' });
    expect(trigger.querySelector('[data-testid="light-ink-backdrop"]')).not.toBeNull();
  });

  it('draws dark ink without a chip', () => {
    renderToolbar('pen', { color: '#111827' });

    const trigger = screen.getByRole('button', { name: 'Pen style: Pen' });
    expect(trigger.querySelector('[data-testid="light-ink-backdrop"]')).toBeNull();
  });
});

describe('CanvasToolbar insert actions', () => {
  it('shows the sticker button next to the emoji button in the panel', async () => {
    const props = renderToolbar('pen');

    expect(screen.getByRole('button', { name: 'Insert an emoji' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Insert a sticker' }));

    expect(props.onPickSticker).toHaveBeenCalled();
  });

  it('folds photo, emoji and sticker into one Insert flyout in the phone dock', async () => {
    const props = renderToolbar('pen', { variant: 'dock' });

    expect(screen.queryByRole('button', { name: 'Insert a sticker' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Insert a photo, emoji or sticker' }));
    expect(screen.getByRole('button', { name: 'Insert a photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert an emoji' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Insert a sticker' }));

    expect(props.onPickSticker).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Insert a sticker' })).not.toBeInTheDocument();
  });
});

describe('CanvasToolbar shape tool', () => {
  it('offers shape kinds and the outline/filled switch only for the shape tool', async () => {
    const props = renderToolbar('shape');

    await userEvent.click(screen.getByRole('button', { name: 'Shape: Rectangle' }));
    await userEvent.click(screen.getByRole('button', { name: 'Filled' }));
    expect(props.onShapeFilledChange).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByRole('button', { name: 'Heart' }));
    expect(props.onShapeKindChange).toHaveBeenCalledWith('heart');
    // Line width applies to shapes too, like the pen.
    expect(screen.getByRole('button', { name: 'Line width: 6' })).toBeInTheDocument();
  });
});
