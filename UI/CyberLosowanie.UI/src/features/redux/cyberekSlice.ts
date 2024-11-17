import { cyberekModel } from "@/interfaces";
import { createSlice } from "@reduxjs/toolkit";

export const initialState: cyberekModel = {
  id: 0,
  name: "",
  surname: "",
  imageUrl: "",
  giftedCyberekId: 0,
  bannedCyberki: []
};

export const cyberekSlice = createSlice({
  name: "CyberekItem",
  initialState: initialState,
  reducers: {
    setCyberekItem: (state, action) => {
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.surname = action.payload.surname;
      state.imageUrl = action.payload.imageUrl;
      state.giftedCyberekId = action.payload.giftedCyberekId;
      state.bannedCyberki = action.payload.bannedCyberki;
    },
    resetCyberek: (state) => {
      state.id = 0;
      state.name = "";
      state.surname = "";
      state.imageUrl = "";
      state.giftedCyberekId = 0;
      state.bannedCyberki = [];
    },
  },
});

export const { setCyberekItem, resetCyberek} = cyberekSlice.actions;
export const cyberekItemReducer = cyberekSlice.reducer;
