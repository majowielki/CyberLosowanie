import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import PasswordInput from './PasswordInput';

const renderInForm = () =>
  renderWithProviders(
    <form aria-label="login" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="pw">Password</label>
      <PasswordInput id="pw" defaultValue="tajne-haslo" />
    </form>,
    { language: 'en' }
  );

describe('PasswordInput', () => {
  it('hides the password until the eye button is pressed', async () => {
    renderInForm();
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides it again when pressed a second time', async () => {
    renderInForm();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('switches back to hidden when the form is submitted', async () => {
    renderInForm();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    fireEvent.submit(screen.getByRole('form', { name: 'login' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('does not submit the form itself', async () => {
    let submitted = false;
    renderWithProviders(
      <form onSubmit={(event) => { event.preventDefault(); submitted = true; }}>
        <PasswordInput aria-label="Password" />
      </form>,
      { language: 'en' }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(submitted).toBe(false);
  });
});
