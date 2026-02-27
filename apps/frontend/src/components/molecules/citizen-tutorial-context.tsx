'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useUserShell } from '@/components/molecules/user-shell-context';
import { CitizenTourOverlay } from '@/components/molecules/citizen-tour-overlay';
import { TUTORIAL_STORAGE_KEY, TOUR_STEPS } from '@/constants/tutorial';
import { ROUTES } from '@/constants/routes';

/** Delay before auto-starting the tour so the page and DOM are ready (first login). */
const AUTO_START_DELAY_MS = 1800;
/** Brief delay after opening the sidebar so the tour highlights the visible menu. */
const SIDEBAR_OPEN_DELAY_MS = 350;

/** Routes where we consider the user "landed" for first-login tutorial trigger. */
const FIRST_LOGIN_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.DEFAULT,
  ROUTES.APPLICATION,
  ROUTES.SERVICES,
  ROUTES.STATUS,
  ROUTES.TRANSACTION_HISTORY,
  ROUTES.SETTINGS,
];

type CitizenTutorialContextValue = {
  /** Starts the guided tour (opens sidebar first). Returns true when the tour has started. */
  startTutorial: () => Promise<boolean>;
};

const CitizenTutorialContext =
  React.createContext<CitizenTutorialContextValue | null>(null);

export function useCitizenTutorial(): CitizenTutorialContextValue | null {
  return React.useContext(CitizenTutorialContext);
}

interface CitizenTutorialProviderProps {
  children: React.ReactNode;
}

function hasCompletedTutorial(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
}

function markTutorialDone(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
}

/**
 * Provides the in-app guided tutorial for the Citizen Portal (custom implementation, no third-party lib).
 * Auto-starts on first login; opens the sidebar before starting; skip, close, or revisit from Settings anytime.
 */
export function CitizenTutorialProvider({
  children,
}: CitizenTutorialProviderProps): React.JSX.Element {
  const pathname = usePathname();
  const shell = useUserShell();
  const [isActive, setIsActive] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const autoStartedRef = React.useRef(false);
  const timeoutRef = React.useRef<number | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const startTutorial = React.useCallback((): Promise<boolean> => {
    shell.setSidebarOpen(true);
    return new Promise<boolean>((resolve) => {
      window.setTimeout(() => {
        if (isMountedRef.current) {
          setIsActive(true);
          setCurrentIndex(0);
        }
        resolve(true);
      }, SIDEBAR_OPEN_DELAY_MS);
    });
  }, [shell]);

  const nextStep = React.useCallback(() => {
    setCurrentIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        markTutorialDone();
        setIsActive(false);
        return i;
      }
      return i + 1;
    });
  }, []);

  const prevStep = React.useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  const closeTour = React.useCallback(() => {
    markTutorialDone();
    setIsActive(false);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const isFirstLoginRoute = FIRST_LOGIN_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(r + '/')
    );
    if (!isFirstLoginRoute) return;
    if (hasCompletedTutorial()) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      startTutorial();
    }, AUTO_START_DELAY_MS);
  }, [pathname, startTutorial]);

  const value = React.useMemo(
    () => ({ startTutorial }),
    [startTutorial]
  );

  return (
    <CitizenTutorialContext.Provider value={value}>
      {children}
      <CitizenTourOverlay
        isActive={isActive}
        currentIndex={currentIndex}
        steps={TOUR_STEPS}
        onNext={nextStep}
        onPrev={prevStep}
        onClose={closeTour}
      />
    </CitizenTutorialContext.Provider>
  );
}

export { TUTORIAL_STORAGE_KEY };
