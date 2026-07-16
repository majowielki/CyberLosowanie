import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, PersistedState } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authApi from "@/features/auth/authApi";
import cyberLosowanieApi from "@/features/cyberki/cyberLosowanieApi";
import wishlistApi from "@/features/wishlist/wishlistApi";
import { userAuthReducer } from "@/features/auth/userSlice";
import { localeReducer } from "@/shared/i18n/localeSlice";

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
      .concat(authApi.middleware)
      .concat(cyberLosowanieApi.middleware)
      .concat(wishlistApi.middleware)
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;

export default store;
