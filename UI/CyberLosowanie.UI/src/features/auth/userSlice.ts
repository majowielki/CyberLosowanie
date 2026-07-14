import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { userModel } from "@/types";

export const emptyUserState: userModel = {
  fullName: "",
  id: "",
  cyberekId: null,
  giftedCyberekId: null,
};

export const userSlice = createSlice({
  name: "userAuth",
  initialState: emptyUserState,
  reducers: {
    setLoggedInUser: (state, action: PayloadAction<userModel>) => {
      state.fullName = action.payload.fullName;
      state.id = action.payload.id;
      state.cyberekId = action.payload.cyberekId;
      state.giftedCyberekId = action.payload.giftedCyberekId;
    },
    resetUser: (state) => {
      state.id = "";
      state.fullName = "";
      state.cyberekId = null;
      state.giftedCyberekId = null;
    },
    setCyberekId: (state, action: PayloadAction<number>) => {
      state.cyberekId = action.payload;
    },
    setGiftedCyberekId: (state, action: PayloadAction<number>) => {
      state.giftedCyberekId = action.payload;
    },
  },
});

export const { setLoggedInUser, resetUser, setCyberekId, setGiftedCyberekId } = userSlice.actions;
export const userAuthReducer = userSlice.reducer;
