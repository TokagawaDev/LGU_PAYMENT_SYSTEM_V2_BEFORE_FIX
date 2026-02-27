'use client';

import { createContext, useContext } from 'react';

export type UserShellContextValue = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  activeDialog: 'support' | 'faq' | null;
  openDialog: (dialog: 'support' | 'faq') => void;
  closeDialog: () => void;
};

const UserShellContext = createContext<UserShellContextValue | null>(null);

export const UserShellProvider = UserShellContext.Provider;

export function useUserShell(): UserShellContextValue {
  const ctx = useContext(UserShellContext);
  if (!ctx)
    throw new Error('useUserShell must be used within UserShellProvider');
  return ctx;
}

export function useOptionalUserShell(): UserShellContextValue | null {
  return useContext(UserShellContext);
}
