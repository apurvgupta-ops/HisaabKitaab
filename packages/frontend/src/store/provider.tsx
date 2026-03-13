'use client';

import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { hydrateAuth } from './slices/authSlice';
import { ThemeProvider } from '@/components/theme-provider';

interface StoreProviderProps {
  children: React.ReactNode;
}

const AuthHydrator = ({ children }: { children: React.ReactNode }) => {
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      store.dispatch(hydrateAuth());
    }
  }, []);

  return <>{children}</>;
};

export const StoreProvider = ({ children }: StoreProviderProps) => {
  return (
    <Provider store={store}>
      <AuthHydrator>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthHydrator>
    </Provider>
  );
};
