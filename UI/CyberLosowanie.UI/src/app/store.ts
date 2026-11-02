import { configureStore, combineReducers, createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { persistStore, persistReducer, PersistedState } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authApi from "@/features/auth/authApi";
import cyberLosowanieApi from "@/features/cyberki/cyberLosowanieApi";
import wishlistApi from "@/features/wishlist/wishlistApi";
import { resetUser, setLoggedInUser, userAuthReducer } from "@/features/auth/userSlice";
import { localeReducer } from "@/shared/i18n/localeSlice";
import { userModel } from "@/types";

// API caches hold one person's answers (their boxes, their draw result, the
// wishlists they may see). When the session changes hands — logout, an expired
// session, or another account signing in on the same phone without a reload —
// they are dropped, so nothing of the previous person is ever shown to the next.
const sessionChange = createListenerMiddleware();
sessionChange.startListening({
  matcher: isAnyOf(setLoggedInUser, resetUser),
  effect: (action, listenerApi) => {
    const previous = (listenerApi.getOriginalState() as { userAuthStore: userModel }).userAuthStore;
    // Only when the session leaves a person behind. Signing in from a signed-out
    // state (incl. the session restored from the token on page load) has nothing to
    // drop — logout already did — and resetting then would cut the page's first
    // requests mid-flight, which RTK Query does not restart.
    if (!previous.id || (setLoggedInUser.match(action) && action.payload.id === previous.id)) {
      return;
    }
    listenerApi.dispatch(cyberLosowanieApi.util.resetApiState());
    listenerApi.dispatch(wishlistApi.util.resetApiState());
  },
});

// Persist only the user session runtime state and the UI language — everything
// else is re-fetched from the API or derived from the JWT (H3).
const persistConfig = {
  key: 'root',
  storage,
  // v0 stored cyberekId/giftedCyberekId as strings with a "0" sentinel (E5).
  // Drop state from other versions — useAuthPersistence rebuilds the session
  // from the JWT. Current-version state must survive, otherwise the persisted
  // language choice would reset on every reload.
  version: 1,
  migrate: (state: PersistedState) =>
    Promise.resolve(state?._persist.version === 1 ? state : undefined),
  whitelist: ['userAuthStore', 'localeStore']
};

const rootReducer = combineReducers({
  userAuthStore: userAuthReducer,
  localeStore: localeReducer,
  [authApi.reducerPath]: authApi.reducer,
  [cyberLosowanieApi.reducerPath]: cyberLosowanieApi.reducer,
  [wishlistApi.reducerPath]: wishlistApi.reducer
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PURGE',
          'persist/FLUSH',
          'persist/PAUSE',
          'persist/REGISTER',
        ]
      }
    })
      .prepend(sessionChange.middleware)
      .concat(authApi.middleware)
      .concat(cyberLosowanieApi.middleware)
      .concat(wishlistApi.middleware)
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;

export default store;
