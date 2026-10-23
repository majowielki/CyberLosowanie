import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const toastMock = vi.fn();
vi.mock('@/shared/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

const assignMock = vi.fn();
vi.mock('./cyberLosowanieApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cyberLosowanieApi')>();
  const cyberki = [1, 2].map((id) => ({ id, name: `N${id}`, surname: '' }));
  return {
    ...actual,
    useGetCyberkiQuery: () => ({ data: { data: cyberki }, isLoading: false }),
    useGetAvailableToPickQuery: () => ({ data: { data: cyberki }, isLoading: false }),
    useAssignCyberekMutation: () => [(arg: unknown) => ({ unwrap: () => assignMock(arg) })],
  };
});

import SelectYourCyberek from './SelectYourCyberek';

const pickFirstAndConfirm = async () => {
  await userEvent.click(screen.getAllByRole('radio')[0]);
  await userEvent.click(screen.getByRole('button', { name: "Yes, that's me — N1" }));
};

describe('SelectYourCyberek', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastMock.mockReset();
    assignMock.mockReset();
  });

  it('moves on to the draw once the pick is saved', async () => {
    assignMock.mockResolvedValue({ isSuccess: true });
    renderWithProviders(<SelectYourCyberek />, { language: 'en' });

    await pickFirstAndConfirm();

    expect(assignMock).toHaveBeenCalledWith({ cyberekId: 1 });
    expect(navigateMock).toHaveBeenCalledWith('/choose-to-be-gifted-cyberek');
  });

  it('stays on the page and explains when someone else took the cyberek first', async () => {
    assignMock.mockRejectedValue({ status: 409, data: { isSuccess: false } });
    renderWithProviders(<SelectYourCyberek />, { language: 'en' });

    await pickFirstAndConfirm();

    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Someone has just picked this cyberek. Please choose another one.' }),
    );
    expect(screen.getByRole('button', { name: 'Pick your photo' })).toBeDisabled();
  });

  it('stays on the page when saving fails for another reason', async () => {
    assignMock.mockRejectedValue({ status: 500 });
    renderWithProviders(<SelectYourCyberek />, { language: 'en' });

    await pickFirstAndConfirm();

    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Failed to select cyberek. Please try again.' }),
    );
  });
});
