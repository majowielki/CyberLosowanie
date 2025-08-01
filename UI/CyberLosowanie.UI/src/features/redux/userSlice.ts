import { createSlice } from "@reduxjs/toolkit";
import { userModel } from "@/interfaces";
import { userStateUtils } from "@/helpers/userStateHelper";

export const emptyUserState: userModel = {
  fullName: "",
  id: "",
  cyberekId: "0",
  giftedCyberekId: "0",
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
      
      // Save to localStorage as backup
      userStateUtils.saveUserState(state as userModel);
    },
    resetUser: (state) => {
      state.id = "";
      state.fullName = "";
      state.cyberekId = "0";
      state.giftedCyberekId = "0";
      
      // Clear saved state
      userStateUtils.clearUserState();
    },
    setCyberekId: (state, action) => {
      state.cyberekId = action.payload;
      
      // Save updated state
      userStateUtils.saveUserState(state as userModel);
    },
    setGiftedCyberekId: (state, action) => {
      state.giftedCyberekId = action.payload;
      
      // Save updated state
      userStateUtils.saveUserState(state as userModel);
    },
  },
});

export const { setLoggedInUser, resetUser, setCyberekId, setGiftedCyberekId } = userSlice.actions;
export const userAuthReducer = userSlice.reducer;
