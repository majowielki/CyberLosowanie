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
    isUploadingImage: false,
    ...overrides,
  };
  renderWithProviders(<CanvasToolbar {...props} />, { language: 'en' });
  return props;
};

describe('CanvasToolbar flyouts', () => {
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
