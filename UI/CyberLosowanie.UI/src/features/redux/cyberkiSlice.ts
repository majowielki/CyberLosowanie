import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cyberki: [],
};

export const cyberkiSlice = createSlice({
  name: "CyberkiList",
  initialState: initialState,
  reducers: {
    setCyberkiList: (state, action) => {
      state.cyberki = action.payload;
    },
  },
});

export const { setCyberkiList} = cyberkiSlice.actions;
export const cyberkiListReducer = cyberkiSlice.reducer;
