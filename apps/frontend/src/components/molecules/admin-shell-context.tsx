'use client';

import { createContext, useContext } from 'react';

export type AdminShellContextValue = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export const AdminShellProvider = AdminShellContext.Provider;

export function useAdminShell(): AdminShellContextValue {
  const ctx = useContext(AdminShellContext);
  if (!ctx)
    throw new Error('useAdminShell must be used within AdminShellProvider');
  return ctx;
}

export function useOptionalAdminShell(): AdminShellContextValue | null {
  return useContext(AdminShellContext);
}
