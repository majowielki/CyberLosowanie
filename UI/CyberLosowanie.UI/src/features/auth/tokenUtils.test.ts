import { describe, it, expect } from 'vitest';
import { tokenUtils, userFromToken } from './tokenUtils';
import { tokenClaims } from '@/types';

// Builds a structurally valid (unsigned) JWT so jwt-decode can read the payload.
const makeToken = (payload: Record<string, unknown>): string => {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
};

describe('tokenUtils.isTokenExpired', () => {
  it('treats an unparsable token as expired', () => {
    expect(tokenUtils.isTokenExpired('not-a-jwt')).toBe(true);
  });

  it('reports an expired token as expired', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(tokenUtils.isTokenExpired(makeToken({ exp: past }))).toBe(true);
  });

  it('reports a token with a future expiry as valid', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(tokenUtils.isTokenExpired(makeToken({ exp: future }))).toBe(false);
  });

  it('treats a token with no exp claim as expired', () => {
    expect(tokenUtils.isTokenExpired(makeToken({ sub: 'x' }))).toBe(true);
  });
});

describe('tokenUtils.clearAuthData', () => {
  it('removes the token from localStorage', () => {
    localStorage.setItem('token', 'abc');
    tokenUtils.clearAuthData();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('userFromToken', () => {
  it('maps claim strings to the user model', () => {
    const claims: tokenClaims = { fullName: 'John', id: 'u1', cyberekId: '3', giftedCyberekId: '7' };
    expect(userFromToken(claims)).toEqual({ fullName: 'John', id: 'u1', cyberekId: 3, giftedCyberekId: 7 });
  });

  it('maps the "0" sentinel to null (E5)', () => {
    const claims: tokenClaims = { fullName: 'John', id: 'u1', cyberekId: '0', giftedCyberekId: '0' };
    const user = userFromToken(claims);
    expect(user.cyberekId).toBeNull();
    expect(user.giftedCyberekId).toBeNull();
  });

  it('falls back to safe defaults for missing claims', () => {
    expect(userFromToken({})).toEqual({ fullName: '', id: '', cyberekId: null, giftedCyberekId: null });
  });
});
