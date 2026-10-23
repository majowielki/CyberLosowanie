import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';

// Each mutation hook returns [trigger, state]; trigger(...).unwrap() is what the pages await.
const forgotPasswordMock = vi.fn();
const resetPasswordMock = vi.fn();
const asMutation = (mock: ReturnType<typeof vi.fn>) => [
  (arg: unknown) => ({ unwrap: () => mock(arg) }),
  { isLoading: false },
];
vi.mock('./authApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./authApi')>();
  return {
    ...actual,
    useForgotPasswordMutation: () => asMutation(forgotPasswordMock),
    useResetPasswordMutation: () => asMutation(resetPasswordMock),
  };
});

import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

beforeEach(() => {
  forgotPasswordMock.mockReset();
  resetPasswordMock.mockReset();
});

describe('ForgotPassword', () => {
  it('prefills the login from the link and shows a neutral confirmation', async () => {
    forgotPasswordMock.mockResolvedValue({ isSuccess: true });
    renderWithProviders(<ForgotPassword />, { language: 'en', route: '/forgot-password?login=Micha%C5%82' });

    const field = screen.getByLabelText('Username or email');
    expect(field).toHaveValue('Michał');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));

    expect(forgotPasswordMock).toHaveBeenCalledWith({ login: 'Michał' });
    expect(await screen.findByRole('status')).toHaveTextContent('If the account exists');
  });

  it('explains a rate limit', async () => {
    forgotPasswordMock.mockRejectedValue({ status: 429 });
    renderWithProviders(<ForgotPassword />, { language: 'en', route: '/forgot-password' });

    await userEvent.type(screen.getByLabelText('Username or email'), 'john');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
  });
});

describe('ResetPassword', () => {
  const route = '/reset-password?userId=u1&token=abc';

  const submitPassword = async (password: string) => {
    await userEvent.type(screen.getByLabelText('New password'), password);
    await userEvent.click(screen.getByRole('button', { name: 'Set the new password' }));
  };

  it('sends the link values with the new password and offers to sign in', async () => {
    resetPasswordMock.mockResolvedValue({ isSuccess: true });
    renderWithProviders(<ResetPassword />, { language: 'en', route });

    await submitPassword('NoweHaslo1');

    expect(resetPasswordMock).toHaveBeenCalledWith({ userId: 'u1', token: 'abc', newPassword: 'NoweHaslo1' });
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('asks for the new password once, with the show/hide toggle', () => {
    renderWithProviders(<ResetPassword />, { language: 'en', route });

    expect(screen.getAllByLabelText(/password/i, { selector: 'input' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('shows the server password rules and keeps the form', async () => {
    resetPasswordMock.mockRejectedValue({
      status: 400,
      data: { isSuccess: false, errors: ['Passwords must be at least 6 characters.'] },
    });
    renderWithProviders(<ResetPassword />, { language: 'en', route });

    await submitPassword('123');

    expect(await screen.findByRole('alert')).toHaveTextContent('at least 6 characters');
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  it('offers a new link when the link expired or was used', async () => {
    resetPasswordMock.mockRejectedValue({
      status: 400,
      data: { isSuccess: false, errors: ['The password reset link is invalid or has expired'] },
    });
    renderWithProviders(<ResetPassword />, { language: 'en', route });

    await submitPassword('NoweHaslo1');

    expect(await screen.findByRole('alert')).toHaveTextContent('already used');
    expect(screen.getByRole('button', { name: 'Send a new link' })).toBeInTheDocument();
  });

  it('drops the token from the address bar but still uses it', async () => {
    resetPasswordMock.mockResolvedValue({ isSuccess: true });
    const locations: string[] = [];
    function LocationProbe() {
      const location = useLocation();
      locations.push(location.pathname + location.search);
      return null;
    }
    renderWithProviders(
      <>
        <ResetPassword />
        <LocationProbe />
      </>,
      { language: 'en', route }
    );

    expect(locations.at(-1)).toBe('/reset-password');
    await submitPassword('NoweHaslo1');

    expect(resetPasswordMock).toHaveBeenCalledWith({ userId: 'u1', token: 'abc', newPassword: 'NoweHaslo1' });
  });

  it('treats a link without its values as invalid', () => {
    renderWithProviders(<ResetPassword />, { language: 'en', route: '/reset-password' });

    expect(screen.getByRole('alert')).toHaveTextContent('invalid');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});
