import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface SessionState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const value = useMemo(() => ({ accessToken, setAccessToken }), [accessToken]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return ctx;
}
