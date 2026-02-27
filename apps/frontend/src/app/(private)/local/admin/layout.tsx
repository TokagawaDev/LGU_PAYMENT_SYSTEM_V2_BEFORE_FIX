'use client';

import { ReactNode, useState, useMemo, useCallback, useEffect } from 'react';
import AdminSidebar from '@/components/molecules/admin-sidebar';
import { AdminShellProvider } from '@/components/molecules/admin-shell-context';
import MobileAdminWarning from '@/components/molecules/mobile-admin-warning';

type AdminLayoutProps = { children: ReactNode };

export default function AdminLayout({
  children,
}: AdminLayoutProps): React.JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const ctx = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar,
      setSidebarOpen: setIsSidebarOpen,
      isSidebarCollapsed,
      setSidebarCollapsed: setIsSidebarCollapsed,
    }),
    [isSidebarOpen, toggleSidebar, isSidebarCollapsed]
  );

  useEffect(() => {
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setIsSidebarOpen(true);
    }
  }, []);

  return (
    <AdminShellProvider value={ctx}>
      <div className="min-h-screen bg-gray-50 flex relative">
        {/* Mobile screen warning */}
        <MobileAdminWarning minWidth={1024} />
        {/* Desktop Sidebar */}
        <div
          className={`hidden md:block transition-[width] duration-smooth ease-smooth shrink-0 ${
            isSidebarOpen
              ? isSidebarCollapsed
                ? 'w-16'
                : 'w-64'
              : 'w-0'
          }`}
        >
          <div className="h-screen sticky top-0">
            <div
              className={`w-full h-full transition-transform duration-smooth ease-smooth ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <AdminSidebar />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[60] flex md:hidden overscroll-contain">
            {/* Sidebar panel */}
            <div className="relative w-64 bg-white shadow-lg h-full overflow-y-auto">
              <AdminSidebar />
            </div>
            {/* Backdrop */}
            <div
              className="flex-1 bg-black bg-opacity-50"
              onClick={() => setIsSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {children}
        </div>
      </div>
    </AdminShellProvider>
  );
}
