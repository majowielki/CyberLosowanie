import { describe, it, expect } from 'vitest';
import {
  userAuthReducer,
  emptyUserState,
  setLoggedInUser,
  resetUser,
  setCyberekId,
  setGiftedCyberekId,
} from './userSlice';
import { userModel } from '@/types';

const loggedIn: userModel = { fullName: 'John', id: 'u1', cyberekId: 2, giftedCyberekId: 5 };

describe('userSlice', () => {
  it('setLoggedInUser stores the full user model', () => {
    const state = userAuthReducer(emptyUserState, setLoggedInUser(loggedIn));
    expect(state).toEqual(loggedIn);
  });

  it('resetUser clears the session back to empty', () => {
    const state = userAuthReducer(loggedIn, resetUser());
    expect(state).toEqual(emptyUserState);
  });

  it('setCyberekId updates only the cyberek id', () => {
    const state = userAuthReducer(emptyUserState, setCyberekId(4));
    expect(state.cyberekId).toBe(4);
    expect(state.giftedCyberekId).toBeNull();
  });

  it('setGiftedCyberekId updates only the gifted cyberek id', () => {
    const state = userAuthReducer(emptyUserState, setGiftedCyberekId(9));
    expect(state.giftedCyberekId).toBe(9);
    expect(state.cyberekId).toBeNull();
  });
});
