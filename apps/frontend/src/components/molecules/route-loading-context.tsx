'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

interface RouteLoadingContextValue {
  isRouteLoading: boolean;
  startRouteTransition: () => void;
  stopRouteTransition: () => void;
}

const RouteLoadingContext = createContext<RouteLoadingContextValue | undefined>(
  undefined
);

export function RouteLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const pathname = usePathname();
  // Auto-stop on pathname change to avoid stuck overlay on pages without explicit stop
  useEffect(() => {
    setIsRouteLoading(false);
  }, [pathname]);

  // Safety: auto-stop after 15s in case of unexpected errors
  useEffect(() => {
    if (!isRouteLoading) return;
    const id = setTimeout(() => setIsRouteLoading(false), 15000);
    return () => clearTimeout(id);
  }, [isRouteLoading]);

  const startRouteTransition = useCallback(() => setIsRouteLoading(true), []);
  const stopRouteTransition = useCallback(() => setIsRouteLoading(false), []);

  const value = useMemo(
    () => ({ isRouteLoading, startRouteTransition, stopRouteTransition }),
    [isRouteLoading, startRouteTransition, stopRouteTransition]
  );

  return (
    <RouteLoadingContext.Provider value={value}>
      {children}
    </RouteLoadingContext.Provider>
  );
}

export function useRouteLoading(): RouteLoadingContextValue {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) {
    throw new Error('useRouteLoading must be used within RouteLoadingProvider');
  }
  return ctx;
}
