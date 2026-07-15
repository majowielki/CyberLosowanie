import { describe, it, expect } from 'vitest';
import type { ChangeEvent } from 'react';
import inputHelper from './inputHelper';

const changeEvent = (name: string, value: string) =>
  ({ target: { name, value } }) as ChangeEvent<HTMLInputElement>;

describe('inputHelper', () => {
  it('updates the field matching the input name', () => {
    const state = { userName: 'a', password: '' };
    const next = inputHelper(changeEvent('password', 'secret'), state);
    expect(next).toEqual({ userName: 'a', password: 'secret' });
  });

  it('returns a new object without mutating the original', () => {
    const state = { userName: 'a', password: '' };
    const next = inputHelper(changeEvent('userName', 'b'), state);
    expect(next).not.toBe(state);
    expect(state.userName).toBe('a');
  });
});
