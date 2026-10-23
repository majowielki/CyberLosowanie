import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';

const toastMock = vi.fn();
vi.mock('@/shared/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

import { withSessionGuard } from './sessionGuard';
import { resetUser } from './userSlice';

const apiWith = (language: 'pl' | 'en') => {
  const dispatch = vi.fn();
  return {
    dispatch,
    api: { dispatch, getState: () => ({ localeStore: { language } }) } as unknown as BaseQueryApi,
  };
};

describe('withSessionGuard', () => {
  beforeEach(() => {
    toastMock.mockReset();
    localStorage.setItem('token', 'old-session');
  });

  it('signs out and explains why when the server rejects the session', async () => {
    const { api, dispatch } = apiWith('en');
    const guarded = withSessionGuard(async () => ({ error: { status: 401, data: undefined } }));

    const result = await guarded('wishlist/my', api, {});

    expect(result.error?.status).toBe(401);
    expect(localStorage.getItem('token')).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(resetUser());
    expect(toastMock).toHaveBeenCalledWith({ description: 'Your session has ended — please sign in again.' });
  });

  it('leaves the session alone for other errors and successes', async () => {
    const { api, dispatch } = apiWith('pl');

    await withSessionGuard(async () => ({ error: { status: 403, data: undefined } }))('x', api, {});
    await withSessionGuard(async () => ({ data: { isSuccess: true } }))('x', api, {});

    expect(localStorage.getItem('token')).toBe('old-session');
    expect(dispatch).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('does nothing on a 401 without a stored token (already signed out)', async () => {
    localStorage.removeItem('token');
    const { api, dispatch } = apiWith('pl');

    await withSessionGuard(async () => ({ error: { status: 401, data: undefined } }))('x', api, {});

    expect(dispatch).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });
});
