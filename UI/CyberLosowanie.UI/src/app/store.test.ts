import { describe, expect, it } from 'vitest';
import store from './store';
import cyberLosowanieApi from '@/features/cyberki/cyberLosowanieApi';
import { emptyUserState, resetUser, setLoggedInUser } from '@/features/auth/userSlice';

const signIn = (id: string) => store.dispatch(setLoggedInUser({ ...emptyUserState, id, fullName: id }));

// Pretend this person's draw result has been fetched and cached.
const cacheDrawResult = (name: string) =>
  store.dispatch(
    cyberLosowanieApi.util.upsertQueryData('getMyGiftedCyberek', undefined, {
      isSuccess: true,
      data: { id: 9, name, surname: '' },
      message: '',
      errors: [],
      statusCode: 200,
    }),
  );

const cachedDrawResult = () =>
  cyberLosowanieApi.endpoints.getMyGiftedCyberek.select(undefined)(store.getState()).data?.data?.name;

// One phone passed around at the party: nobody may see the previous person's answers.
describe('store — session changes', () => {
  it('drops the cached answers when another account signs in', async () => {
    signIn('anna');
    await cacheDrawResult('Karol');
    expect(cachedDrawResult()).toBe('Karol');

    signIn('bartek');

    expect(cachedDrawResult()).toBeUndefined();
  });

  it('drops them on logout', async () => {
    signIn('anna');
    await cacheDrawResult('Karol');

    store.dispatch(resetUser());

    expect(cachedDrawResult()).toBeUndefined();
  });

  it('keeps them when the same session is restored', async () => {
    signIn('anna');
    await cacheDrawResult('Karol');

    signIn('anna');

    expect(cachedDrawResult()).toBe('Karol');
  });
});
