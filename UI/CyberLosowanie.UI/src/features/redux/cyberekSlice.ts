import { cyberekModel } from "@/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const initialState: cyberekModel = {
  id: 0,
  name: "",
  surname: "",
  imageUrl: ""
};

export const cyberekSlice = createSlice({
  name: "CyberekItem",
  initialState: initialState,
  reducers: {
    setCyberekItem: (state, action: PayloadAction<cyberekModel>) => {
      state.id = action.payload.id || 0;
      state.name = action.payload.name || "";
      state.surname = action.payload.surname || "";
      state.imageUrl = action.payload.imageUrl || "";
    },
    resetCyberek: (state) => {
      state.id = 0;
      state.name = "";
      state.surname = "";
      state.imageUrl = "";
    },
  },
});

export const { setCyberekItem, resetCyberek} = cyberekSlice.actions;
export const cyberekItemReducer = cyberekSlice.reducer;
