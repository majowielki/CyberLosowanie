import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authApi from "@/features/auth/authApi";
import cyberLosowanieApi from "@/features/cyberki/cyberLosowanieApi";
import { userAuthReducer } from "@/features/auth/userSlice";

// Persist only the user session runtime state — everything else is
// re-fetched from the API or derived from the JWT (H3).
const persistConfig = {
  key: 'root',
  storage,
  // v0 stored cyberekId/giftedCyberekId as strings with a "0" sentinel (E5).
  // Drop such stale state on upgrade — useAuthPersistence rebuilds it from the JWT.
  version: 1,
  migrate: () => Promise.resolve(undefined),
  whitelist: ['userAuthStore']
};

const rootReducer = combineReducers({
  userAuthStore: userAuthReducer,
  [authApi.reducerPath]: authApi.reducer,
  [cyberLosowanieApi.reducerPath]: cyberLosowanieApi.reducer
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
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;

export default store;
