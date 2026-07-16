import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE, Language } from './config';

interface LocaleState {
  language: Language;
}

const initialState: LocaleState = { language: DEFAULT_LANGUAGE };

export const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    toggleLanguage: (state) => {
      state.language = state.language === 'pl' ? 'en' : 'pl';
    },
  },
});

export const { setLanguage, toggleLanguage } = localeSlice.actions;
export const localeReducer = localeSlice.reducer;
