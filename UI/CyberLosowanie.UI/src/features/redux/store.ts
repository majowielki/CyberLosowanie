import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import {
  authApi,
  cyberLosowanieApi
} from "../../apis";
import { userAuthReducer } from "./userSlice";
import { cyberekItemReducer } from "./cyberekSlice";
import { cyberkiListReducer } from "./cyberkiSlice";

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['userAuthStore', 'cyberekItemStore'] // Only persist user and cyberek data
};

// Combine reducers
const rootReducer = combineReducers({
  userAuthStore: userAuthReducer,
  cyberekItemStore: cyberekItemReducer,
  cyberkiListStore: cyberkiListReducer,
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
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    })
      .concat(authApi.middleware)
      .concat(cyberLosowanieApi.middleware)
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;

export default store;