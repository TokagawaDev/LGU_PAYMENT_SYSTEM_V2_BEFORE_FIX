'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/constants/routes';
import { useUserShell } from '@/components/molecules/user-shell-context';
import { Button } from '@/components/ui/button';
import {
  History,
  Home,
  Settings,
  LogOut,
  UserCircle2,
  HelpCircle,
  MessageCircle,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';

/** Tailwind md breakpoint (768px) - close sidebar when below this */
const MOBILE_MAX_WIDTH = 767;

const ICON_SIZE = 'h-5 w-5';
const ICON_CONTAINER_WIDTH = 'w-6';
const NAV_BUTTON_CLASS =
  'w-full justify-start gap-3 min-h-[44px] py-2.5 sm:py-2.5 h-auto font-normal rounded-lg transition-colors duration-fast ease-smooth';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SupportAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dialog: 'support' | 'faq';
};

const MAIN_NAV_ITEMS: Array<NavItem> = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: Home },
];

const SERVICES_NAV_ITEMS: Array<NavItem> = [
  { label: 'Applications', href: ROUTES.APPLICATION, icon: ClipboardList },
  { label: 'Payments', href: ROUTES.SERVICES, icon: Building2 },
];

const ACTIVITY_NAV_ITEMS: Array<NavItem> = [
  { label: 'Transactions', href: ROUTES.TRANSACTION_HISTORY, icon: History },
  { label: 'Status', href: ROUTES.STATUS, icon: ClipboardCheck },
];

const ACCOUNT_NAV_ITEMS: Array<NavItem> = [
  { label: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
];

const SUPPORT_ACTIONS: Array<SupportAction> = [
  { label: 'Contact Support', icon: MessageCircle, dialog: 'support' },
  { label: 'FAQ', icon: HelpCircle, dialog: 'faq' },
];

type SidebarVariant = 'sidebar' | 'drawer';

interface UserSidebarProps {
  /** Use 'drawer' when inside a mobile overlay so the sidebar fills the panel and respects max-width */
  variant?: SidebarVariant;
}

/**
 * User sidebar navigation for the LGU Payment System.
 * Responsive: works in desktop column and mobile overlay; touch-friendly targets; safe-area aware.
 */
export default function UserSidebar({ variant = 'sidebar' }: UserSidebarProps): React.JSX.Element {
  const isDrawer = variant === 'drawer';
  const router = useRouter();
  const pathname = usePathname();
  const { startRouteTransition } = useRouteLoading();
  const { user, logout } = useAuth();
  const shell = useUserShell();
  const isCollapsed = !isDrawer && !shell.isSidebarOpen;

  const closeSidebarOnMobile = React.useCallback((): void => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
    ) {
      shell.setSidebarOpen(false);
    }
  }, [shell]);

  const handleNavigate = React.useCallback(
    (href: string): void => {
      if (href !== pathname) {
        startRouteTransition();
      }
      router.push(href);
      closeSidebarOnMobile();
    },
    [pathname, router, startRouteTransition, closeSidebarOnMobile]
  );

  const handleLogout = React.useCallback(async (): Promise<void> => {
    await logout();
    if (pathname !== ROUTES.HOME) {
      startRouteTransition();
    }
    router.push(ROUTES.HOME);
    closeSidebarOnMobile();
  }, [logout, pathname, router, startRouteTransition, closeSidebarOnMobile]);

  const initials = React.useMemo(() => {
    const fn = user?.firstName?.[0] || '';
    const ln = user?.lastName?.[0] || '';
    const val = (fn + ln).toUpperCase();
    return val.length > 0 ? val : 'U';
  }, [user?.firstName, user?.lastName]);

  const renderNavItem = (item: NavItem): React.JSX.Element => {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Button
        {...(item.href === ROUTES.SETTINGS ? { 'data-tour': 'nav-settings' } : {})}
        variant={isActive ? 'secondary' : 'ghost'}
        className={`group ${NAV_BUTTON_CLASS} ${
          isActive
            ? 'bg-gray-100 text-gray-900 shadow-sm scale-[0.98]'
            : 'text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
        onClick={() => handleNavigate(item.href)}
        title={item.label}
      >
        <span className={`${ICON_CONTAINER_WIDTH} shrink-0 items-center justify-center flex transition-transform duration-fast ease-smooth ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon className={`${ICON_SIZE} text-blue-600 transition-all duration-fast ease-smooth ${isActive ? 'text-blue-700' : 'group-hover:text-blue-700'}`} />
        </span>
        <span className={`truncate transition-all duration-fast ease-smooth ${isActive ? 'font-medium' : 'group-hover:font-medium'}`}>
          {item.label}
        </span>
      </Button>
    );
  };

  const renderNavItemCollapsed = (item: NavItem): React.JSX.Element => {
    const isActive = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Button
        {...(item.href === ROUTES.SETTINGS ? { 'data-tour': 'nav-settings' } : {})}
        variant={isActive ? 'secondary' : 'ghost'}
        size="icon"
        className={`group h-9 w-9 shrink-0 rounded-lg transition-all duration-fast ease-smooth ${
          isActive
            ? 'bg-gray-100 text-gray-900 shadow-sm scale-[0.95]'
            : 'text-gray-700 hover:bg-gray-50 hover:scale-110 active:scale-[0.95]'
        }`}
        onClick={() => handleNavigate(item.href)}
        title={item.label}
        aria-label={item.label}
      >
        <Icon className={`${ICON_SIZE} text-blue-600 transition-all duration-fast ease-smooth ${isActive ? 'text-blue-700 scale-110' : 'group-hover:text-blue-700 group-hover:scale-110'}`} />
      </Button>
    );
  };

  return (
    <aside
      data-tour="sidebar"
      className={`flex h-screen w-full flex-col border-r border-gray-200 bg-white overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] ${
        isCollapsed ? 'max-w-16' : 'max-w-64'
      } ${isDrawer ? 'absolute inset-0 z-0 min-h-[100dvh]' : 'sticky top-0 z-30'}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Top: Quick Actions + menu toggle */}
        <div
          className={`flex shrink-0 items-center border-b border-gray-200 bg-white px-3 py-3.5 ${
            isCollapsed ? 'justify-center px-0' : 'justify-between gap-2'
          }`}
        >
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-gray-900 truncate min-w-0 py-0.5">
              QUICK ACTIONS
            </h2>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="group shrink-0 h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 active:scale-95 transition-all duration-fast ease-smooth"
            onClick={() => shell.toggleSidebar()}
            aria-label={isCollapsed ? 'Open menu' : 'Close menu'}
            title={isCollapsed ? 'Open menu' : 'Close menu'}
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5 transition-transform duration-fast ease-smooth group-hover:rotate-90" />
            ) : (
              <X className="h-5 w-5 transition-transform duration-fast ease-smooth group-hover:rotate-90" />
            )}
          </Button>
        </div>

        <nav
          className={`flex-1 overflow-y-auto transition-all duration-smooth ease-smooth ${isCollapsed ? 'space-y-1 p-2' : 'space-y-6 p-4'}`}
        >
          <section className={isCollapsed ? 'flex flex-col items-center gap-0.5' : ''}>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Main
              </h2>
            )}
            <ul className={isCollapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
              {MAIN_NAV_ITEMS.map((item, index) => (
                <li
                  key={item.href}
                  className="animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                >
                  {isCollapsed ? renderNavItemCollapsed(item) : renderNavItem(item)}
                </li>
              ))}
            </ul>
          </section>

          <section className={isCollapsed ? 'flex flex-col items-center gap-0.5 mt-2' : ''}>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Services
              </h2>
            )}
            <ul className={isCollapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
              {SERVICES_NAV_ITEMS.map((item, index) => (
                <li
                  key={item.href}
                  className="animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                >
                  {isCollapsed ? renderNavItemCollapsed(item) : renderNavItem(item)}
                </li>
              ))}
            </ul>
          </section>

          <section className={isCollapsed ? 'flex flex-col items-center gap-0.5 mt-2' : ''}>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Activity
              </h2>
            )}
            <ul className={isCollapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
              {ACTIVITY_NAV_ITEMS.map((item, index) => (
                <li
                  key={item.href}
                  className="animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                >
                  {isCollapsed ? renderNavItemCollapsed(item) : renderNavItem(item)}
                </li>
              ))}
            </ul>
          </section>

          <section className={isCollapsed ? 'flex flex-col items-center gap-0.5 mt-2' : ''}>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                Account
              </h2>
            )}
            <ul className={isCollapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
              {ACCOUNT_NAV_ITEMS.map((item, index) => (
                <li
                  key={item.href}
                  className="animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                >
                  {isCollapsed ? renderNavItemCollapsed(item) : renderNavItem(item)}
                </li>
              ))}
            </ul>
          </section>
        </nav>

        <div className="border-t border-gray-200 shrink-0" />
        <div className={`shrink-0 ${isCollapsed ? 'p-2 flex flex-col items-center gap-0.5' : 'p-4'}`}>
          {!isCollapsed && (
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
              Support
            </h2>
          )}
          <ul className={isCollapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
            {SUPPORT_ACTIONS.map(({ label, icon: Icon, dialog }, index) => (
              <li
                key={dialog}
                className="animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              >
                {isCollapsed ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group h-9 w-9 shrink-0 rounded-lg text-gray-700 hover:bg-gray-50 active:scale-95 transition-all duration-fast ease-smooth"
                    onClick={() => {
                      shell.openDialog(dialog);
                      closeSidebarOnMobile();
                    }}
                    title={label}
                    aria-label={label}
                  >
                    <Icon className={`${ICON_SIZE} text-blue-600 transition-all duration-fast ease-smooth group-hover:text-blue-700 group-hover:scale-110`} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className={`group ${NAV_BUTTON_CLASS} text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]`}
                    onClick={() => {
                      shell.openDialog(dialog);
                      closeSidebarOnMobile();
                    }}
                    title={label}
                  >
                    <span className={`${ICON_CONTAINER_WIDTH} shrink-0 items-center justify-center flex transition-transform duration-fast ease-smooth group-hover:scale-110`}>
                      <Icon className={`${ICON_SIZE} text-blue-600 transition-all duration-fast ease-smooth group-hover:text-blue-700`} />
                    </span>
                    <span className="transition-all duration-fast ease-smooth group-hover:font-medium">{label}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`mt-auto border-t border-gray-200 bg-white shrink-0 pb-[env(safe-area-inset-bottom)] ${
            isCollapsed ? 'p-2 flex flex-col items-center gap-1' : 'p-4'
          }`}
        >
          {isCollapsed ? (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold transition-all duration-fast ease-smooth hover:bg-gray-300 hover:scale-110 cursor-pointer">
                {user?.firstName || user?.lastName ? (
                  <span className="text-xs font-semibold">{initials}</span>
                ) : (
                  <UserCircle2 className="h-5 w-5 transition-transform duration-fast ease-smooth" />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="group h-9 w-9 shrink-0 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-700 active:bg-red-100 active:scale-95 transition-all duration-fast ease-smooth"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className={`${ICON_SIZE} transition-transform duration-fast ease-smooth group-hover:rotate-12`} />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] p-2 transition-all duration-fast ease-smooth cursor-pointer">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold transition-all duration-fast ease-smooth hover:bg-gray-300 hover:scale-110">
                  {user?.firstName || user?.lastName ? (
                    <span className="text-xs font-semibold">{initials}</span>
                  ) : (
                    <UserCircle2 className="h-5 w-5 transition-transform duration-fast ease-smooth" />
                  )}
                </div>
                <div className="min-w-0 flex-1 transition-opacity duration-fast ease-smooth">
                  <div className="text-sm font-medium truncate text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  className={`group w-full justify-start gap-3 ${NAV_BUTTON_CLASS} hover:bg-red-50 hover:border-red-200 hover:text-red-700 active:bg-red-100 active:scale-[0.98]`}
                  onClick={handleLogout}
                  title="Logout"
                >
                  <span className={`${ICON_CONTAINER_WIDTH} shrink-0 items-center justify-center flex transition-transform duration-fast ease-smooth group-hover:scale-110`}>
                    <LogOut className={`${ICON_SIZE} transition-transform duration-fast ease-smooth group-hover:rotate-12`} />
                  </span>
                  <span className="transition-all duration-fast ease-smooth">Logout</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
