'use client';

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { hydrateUi, applyThemeToDOM } from '@/store/slices/uiSlice';

/**
 * Hydrates theme from localStorage, applies it to the DOM,
 * and listens for system color-scheme changes when theme is 'system'.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  useEffect(() => {
    dispatch(hydrateUi());
  }, [dispatch]);

  useEffect(() => {
    applyThemeToDOM(theme);

    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDOM('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return <>{children}</>;
};
