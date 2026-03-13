import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark' | 'system';

interface UiState {
  sidebarOpen: boolean;
  theme: Theme;
  activeGroupId: string | null;
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: 'system',
  activeGroupId: null,
};

/**
 * Resolves the effective theme (light/dark) from the stored preference,
 * applying the system preference when set to 'system'.
 */
export const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Applies or removes the `dark` class on <html> and persists the preference. */
export const applyThemeToDOM = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  localStorage.setItem('theme', theme);
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    hydrateUi: (state) => {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem('theme') as Theme | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        state.theme = stored;
      }
    },
    setActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.activeGroupId = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, hydrateUi, setActiveGroup } = uiSlice.actions;
export default uiSlice.reducer;
