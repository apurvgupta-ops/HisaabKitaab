import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeGroupId: string | null;
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: 'system',
  activeGroupId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action: PayloadAction<UiState['theme']>) => {
      state.theme = action.payload;
    },
    setActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.activeGroupId = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setActiveGroup } = uiSlice.actions;
export default uiSlice.reducer;
