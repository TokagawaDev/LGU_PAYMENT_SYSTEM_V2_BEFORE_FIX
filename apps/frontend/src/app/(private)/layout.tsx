'use client';

import { ReactNode, useCallback, useMemo, useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRequireAuth } from '@/hooks/use-auth';
import UserSidebar from '@/components/molecules/user-sidebar';
import { UserShellProvider } from '@/components/molecules/user-shell-context';
import HeaderClient from '@/components/molecules/header-client';
import { usePathname } from 'next/navigation';
import { ContactSupportDialog } from '@/components/molecules/contact-support-dialog';
import { FAQDialog } from '@/components/molecules/faq-dialog';
import { FloatingChatWidget } from '@/components/molecules/floating-chat-widget';
import { NotificationProvider } from '@/components/molecules/notification-context';
import { CitizenTutorialProvider } from '@/components/molecules/citizen-tutorial-context';

interface PrivateLayoutProps {
  children: ReactNode;
}

/**
 * Layout component for private/authenticated routes
 * Handles authentication checks and common layout elements
 */
export default function PrivateLayout({
  children,
}: PrivateLayoutProps): React.JSX.Element {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/local/admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeDialog, setActiveDialog] = useState<'support' | 'faq' | null>(
    null
  );
  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const ctx = useMemo(
    () => ({
      isSidebarOpen,
      toggleSidebar,
      setSidebarOpen: setIsSidebarOpen,
      activeDialog,
      openDialog: (dialog: 'support' | 'faq') => setActiveDialog(dialog),
      closeDialog: () => setActiveDialog(null),
    }),
    [isSidebarOpen, toggleSidebar, activeDialog]
  );

  useEffect(() => {
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setIsSidebarOpen(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div />; // Will redirect in useRequireAuth
  }

  // For admin routes, defer entirely to the admin layout to avoid duplicate sidebars/headers
  if (isAdminPath) {
    return <div>{children}</div>;
  }

  return (
    <UserShellProvider value={ctx}>
      <NotificationProvider>
        <CitizenTutorialProvider>
      <div className="flex h-screen min-h-[100dvh] overflow-hidden bg-gray-50 relative">
        {/* Desktop sidebar: fixed width, full height, does not scroll */}
        <div
          className={`hidden md:block shrink-0 self-stretch overflow-hidden transition-[width] duration-smooth ease-smooth ${
            isSidebarOpen ? 'w-64' : 'w-16'
          }`}
        >
          <div className="h-full min-h-0 flex flex-col">
            <UserSidebar />
          </div>
        </div>
        {/* Mobile sidebar overlay */}
        <div
          className={`fixed inset-0 z-[100] flex md:hidden overscroll-contain min-h-[100dvh] transition-[visibility] duration-smooth ease-smooth ${
            isSidebarOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          aria-hidden={!isSidebarOpen}
        >
          <button
            type="button"
            className={`absolute inset-0 flex-1 min-w-0 bg-black/50 touch-manipulation cursor-pointer min-h-[100dvh] transition-opacity duration-smooth ease-smooth ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
            tabIndex={isSidebarOpen ? 0 : -1}
          />
          <div
            className={`relative w-[min(16rem,calc(100vw-3rem))] max-w-[16rem] min-w-0 shrink-0 bg-white shadow-xl h-full min-h-[100dvh] overflow-hidden flex flex-col pl-[env(safe-area-inset-left)] transition-transform duration-smooth ease-smooth ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <UserSidebar variant="drawer" />
          </div>
        </div>
        {/* Main content: scrollable area so sidebar stays visible */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
          <HeaderClient />
          <main
            data-tour="main-content"
            className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden transition-opacity duration-smooth ease-smooth"
          >
            {children}
          </main>
        </div>
        {/* Global dialog hosts */}
        <ContactSupportDialog
          open={activeDialog === 'support'}
          onOpenChange={(open) => setActiveDialog(open ? 'support' : null)}
        />
        <FAQDialog
          open={activeDialog === 'faq'}
          onOpenChange={(open) => setActiveDialog(open ? 'faq' : null)}
        />
        <FloatingChatWidget />
      </div>
        </CitizenTutorialProvider>
      </NotificationProvider>
    </UserShellProvider>
  );
}
