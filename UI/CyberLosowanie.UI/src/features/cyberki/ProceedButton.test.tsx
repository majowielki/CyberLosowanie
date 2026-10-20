import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { userModel } from '@/types';
import ProceedButton from './ProceedButton';

const renderButton = (user?: Partial<userModel>) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<ProceedButton />} />
      <Route path="*" element={<div>NAVIGATED</div>} />
    </Routes>,
    { user },
  );

describe('ProceedButton', () => {
  it('asks a signed-out visitor to sign in', () => {
    renderButton();

    expect(screen.getByRole('button', { name: /zaloguj się/i })).toBeInTheDocument();
  });

  it('names the step the user is on', () => {
    renderButton({ id: 'u1' });

    expect(screen.getByRole('button', { name: 'Wybierz siebie' })).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 3')).toBeInTheDocument();
  });

  it('offers the box once the user has picked themselves', () => {
    renderButton({ id: 'u1', cyberekId: 3 });

    expect(screen.getByRole('button', { name: 'Otwórz swoje pudełko' })).toBeInTheDocument();
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();
  });

  it('leads to the result after the draw', async () => {
    renderButton({ id: 'u1', cyberekId: 3, giftedCyberekId: 5 });

    expect(screen.getByText('Losowanie zakończone 🎁')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zobacz, kogo obdarowujesz' }));

    expect(screen.getByText('NAVIGATED')).toBeInTheDocument();
  });
});
