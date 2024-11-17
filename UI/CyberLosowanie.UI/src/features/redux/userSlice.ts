import { createSlice } from "@reduxjs/toolkit";
import { userModel } from "@/interfaces";

export const emptyUserState: userModel = {
  fullName: "",
  id: "",
  cyberekId: "",
  giftedCyberekId: "",
};

export const userSlice = createSlice({
  name: "userAuth",
  initialState: emptyUserState,
  reducers: {
    setLoggedInUser: (state, action) => {
      state.fullName = action.payload.fullName;
      state.id = action.payload.id;
      state.cyberekId = action.payload.cyberekId;
      state.giftedCyberekId = action.payload.giftedCyberekId;
    },
    resetUser: (state) => {
      state.id = "";
      state.fullName = "";
      state.cyberekId = "";
      state.giftedCyberekId = "";
    },
    setCyberekId: (state, action) => {
      state.cyberekId = action.payload;
    },
    setGiftedCyberekId: (state, action) => {
      state.giftedCyberekId = action.payload;
    },
  },
});

export const { setLoggedInUser, resetUser, setCyberekId, setGiftedCyberekId } = userSlice.actions;
export const userAuthReducer = userSlice.reducer;
