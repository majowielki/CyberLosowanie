import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

// The page awaits the mutation result directly ({ data } or { error }), without unwrap().
const loginMock = vi.fn();
vi.mock('./authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./authApi')>();
  return { ...actual, useLoginUserMutation: () => [loginMock] };
});

import Login from './Login';

const signIn = async () => {
  await userEvent.type(screen.getByLabelText('Username or email'), 'john');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
};

describe('Login', () => {
  beforeEach(() => loginMock.mockReset());

  it('explains a locked account or too many attempts instead of the raw server text', async () => {
    loginMock.mockResolvedValue({
      error: { status: 429, data: { isSuccess: false, errors: ['Too many failed sign-in attempts.'] } },
    });
    renderWithProviders(<Login />, { language: 'en', route: '/login' });

    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many failed sign-in attempts. Try again in 15 minutes or set a new password.',
    );
  });

  it('shows the server message for a wrong password', async () => {
    loginMock.mockResolvedValue({
      error: { status: 401, data: { isSuccess: false, errors: ['Invalid username or password'] } },
    });
    renderWithProviders(<Login />, { language: 'en', route: '/login' });

    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
  });
});
