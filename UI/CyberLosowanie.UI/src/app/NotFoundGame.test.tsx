import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import NotFoundGame from './NotFoundGame';

describe('NotFoundGame', () => {
  it('counts the presents the visitor catches', () => {
    const { container } = renderWithProviders(<NotFoundGame />);

    expect(screen.getByText(/elfy zgubiły prezenty/i)).toBeInTheDocument();

    // The first present drops right away; tapping it counts once, even if tapped again.
    const present = container.querySelector('.nf-fall img') as HTMLImageElement;
    fireEvent.pointerDown(present);
    fireEvent.pointerDown(present);

    expect(screen.getByText('Złapane prezenty: 1')).toBeInTheDocument();
  });
});
