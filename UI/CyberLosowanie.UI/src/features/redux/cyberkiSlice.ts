import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { cyberekModel } from "@/interfaces";

interface CyberkiState {
  cyberki: cyberekModel[];
}

const initialState: CyberkiState = {
  cyberki: [],
};

export const cyberkiSlice = createSlice({
  name: "CyberkiList",
  initialState: initialState,
  reducers: {
    setCyberkiList: (state, action: PayloadAction<cyberekModel[]>) => {
      state.cyberki = action.payload;
    },
  },
});

export const { setCyberkiList} = cyberkiSlice.actions;
export const cyberkiListReducer = cyberkiSlice.reducer;
