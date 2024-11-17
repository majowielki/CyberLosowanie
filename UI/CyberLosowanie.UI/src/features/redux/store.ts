import { configureStore } from "@reduxjs/toolkit";
import {
  authApi,
  cyberLosowanieApi
} from "../../apis";
import { userAuthReducer } from "./userSlice";
import { cyberekItemReducer } from "./cyberekSlice";
import { cyberkiListReducer } from "./cyberkiSlice";

const store = configureStore({
  reducer: {
    userAuthStore: userAuthReducer,
    cyberekItemStore: cyberekItemReducer,
    cyberkiListStore: cyberkiListReducer,
    [authApi.reducerPath]: authApi.reducer, 
    [cyberLosowanieApi.reducerPath]: cyberLosowanieApi.reducer 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(cyberLosowanieApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;

export default store;