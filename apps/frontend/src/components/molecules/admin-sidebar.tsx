'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { useAuth } from '@/hooks/use-auth';
import { ROUTES } from '@/constants/routes';
import { useAdminShell } from '@/components/molecules/admin-shell-context';
import { Button } from '@/components/ui/button';
import {
  Users as UsersIcon,
  CreditCard as CreditCardIcon,
  LineChart as LineChartIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  ShieldCheck,
  FileText as FileTextIcon,
  LogOut,
  UserCircle2,
  ChevronDown,
  ChevronRight,
  UserCog,
  HardHat,
} from 'lucide-react';
import { SidebarTopBar } from '@/components/molecules/sidebar-top-bar';
import { cn } from '@/lib/utils';

const MOBILE_MAX_WIDTH = 767;
const ICON_SIZE = 'h-5 w-5';
const ICON_CONTAINER_WIDTH = 'w-6';
const NAV_BUTTON_CLASS =
  'w-full justify-start gap-3 min-h-[44px] py-2.5 h-auto font-normal rounded-lg transition-all duration-fast ease-smooth';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  superOnly?: boolean;
  isCollapsible?: boolean;
  children?: Array<{ label: string; href: string; permission?: string }>;
};

const SECTION_TITLE = 'Quick Actions';

/**
 * Admin sidebar navigation.
 * Collapsed (after X): top bar shows only Menu icon; nav shows only icons (Dashboard, Users, etc.).
 * Expanded (after Menu): top bar shows section title + X icon; nav shows icons + labels.
 */
export default function AdminSidebar(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { startRouteTransition } = useRouteLoading();
  const { user, logout } = useAuth();
  const shell = useAdminShell();
  const isCollapsed = shell.isSidebarCollapsed;
  
  // Auto-expand Services if a child is active
  const isServicesChildActive = React.useMemo(() => {
    return pathname === ROUTES.ADMIN.PAYMENT_FORM_BUILDER || 
           pathname === ROUTES.ADMIN.APPLICATION_FORM_BUILDER;
  }, [pathname]);
  
  const [isServicesExpanded, setIsServicesExpanded] = React.useState(isServicesChildActive);
  
  // Update expanded state when pathname changes
  React.useEffect(() => {
    if (isServicesChildActive) {
      setIsServicesExpanded(true);
    }
  }, [isServicesChildActive]);

  const isSuperAdmin = user?.role === 'super_admin';
  const has = (perm: string): boolean =>
    Boolean(user?.permissions?.includes(perm));

  const items: Array<NavItem> = [
    { label: 'Dashboard', href: ROUTES.ADMIN.DASHBOARD, icon: UserCog },
    {
      label: 'Users',
      href: ROUTES.ADMIN.USERS,
      icon: UsersIcon,
      permission: 'manage_users',
    },
    {
      label: 'Transactions',
      href: ROUTES.ADMIN.TRANSACTIONS,
      icon: CreditCardIcon,
      permission: 'manage_transactions',
    },
    {
      label: 'Applications',
      href: ROUTES.ADMIN.APPLICATIONS,
      icon: FileTextIcon,
      permission: 'manage_users',
    },
    {
      label: 'Reports',
      href: ROUTES.ADMIN.REPORTS,
      icon: LineChartIcon,
      permission: 'view_reports',
    },
    {
      label: 'Admins',
      href: ROUTES.ADMIN.ADMINS,
      icon: ShieldCheck,
      superOnly: true,
    },
    {
      label: 'Services',
      href: ROUTES.ADMIN.PAYMENT_FORM_BUILDER,
      icon: HardHat,
      isCollapsible: true,
      children: [
        { 
          label: 'Payment Management Setting', 
          href: ROUTES.ADMIN.PAYMENT_FORM_BUILDER,
          permission: 'payment_management_setting',
        },
        { 
          label: 'Application Management Setting', 
          href: ROUTES.ADMIN.APPLICATION_FORM_BUILDER,
          permission: 'application_management_setting',
        },
      ],
    },
    {
      label: 'Settings',
      href: ROUTES.ADMIN.SETTINGS,
      icon: SettingsIcon,
      permission: 'manage_settings',
    },
  ];

  const visibleItems = items.filter((i) => {
    if (i.superOnly) return isSuperAdmin;
    if (i.isCollapsible && i.children) {
      // For collapsible items, show if at least one child is visible
      const visibleChildren = i.children.filter((child) => {
        if (child.permission) {
          return isSuperAdmin || has(child.permission);
        }
        return true;
      });
      return visibleChildren.length > 0;
    }
    if (i.permission) return isSuperAdmin || has(i.permission);
    return true;
  }).map((i) => {
    // Filter children based on permissions
    if (i.isCollapsible && i.children) {
      return {
        ...i,
        children: i.children.filter((child) => {
          if (child.permission) {
            return isSuperAdmin || has(child.permission);
          }
          return true;
        }),
      };
    }
    return i;
  });

  const closeSidebarOnMobile = React.useCallback((): void => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
    ) {
      shell.setSidebarOpen(false);
    }
  }, [shell]);

  const handleCollapseOrClose = React.useCallback((): void => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
    ) {
      shell.setSidebarOpen(false);
    } else {
      shell.setSidebarCollapsed(true);
    }
  }, [shell]);

  const handleExpand = React.useCallback((): void => {
    shell.setSidebarCollapsed(false);
  }, [shell]);

  const handleLogout = React.useCallback(async (): Promise<void> => {
    await logout();
    if (pathname !== ROUTES.ADMIN.LOGIN) {
      startRouteTransition();
    }
    router.push(ROUTES.ADMIN.LOGIN);
    closeSidebarOnMobile();
  }, [logout, pathname, router, startRouteTransition, closeSidebarOnMobile]);

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

  const initials = React.useMemo(() => {
    const fn = user?.firstName?.[0] || '';
    const ln = user?.lastName?.[0] || '';
    const val = (fn + ln).toUpperCase();
    return val.length > 0 ? val : 'A';
  }, [user?.firstName, user?.lastName]);

  const renderNavItem = (item: NavItem): React.JSX.Element => {
    const isActive = pathname === item.href || 
                     (item.isCollapsible && item.children?.some(child => pathname === child.href));
    const Icon = item.icon;

    if (item.isCollapsible && item.children) {
      const hasActiveChild = item.children.some(child => {
        const childPath = child.href.split('?')[0];
        const childParams = new URLSearchParams(child.href.split('?')[1] || '');
        const currentParams = new URLSearchParams(pathname.split('?')[1] || '');
        return pathname.includes(childPath) && currentParams.get('tab') === childParams.get('tab');
      });

      return (
        <div className="space-y-0.5">
          <Button
            variant={isActive || hasActiveChild ? 'secondary' : 'ghost'}
            className={cn(
              'group w-full',
              isCollapsed ? 'justify-center px-0 min-h-[44px]' : NAV_BUTTON_CLASS,
              isActive || hasActiveChild
                ? 'bg-gray-100 text-gray-900 shadow-sm scale-[0.98]'
                : 'text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]'
            )}
            onClick={() => setIsServicesExpanded(!isServicesExpanded)}
            title={item.label}
          >
            <span className={cn(
              isCollapsed ? 'flex' : ICON_CONTAINER_WIDTH,
              'shrink-0 items-center justify-center transition-transform duration-fast ease-smooth',
              isActive || hasActiveChild ? 'scale-110' : 'group-hover:scale-110'
            )}>
              <Icon className={cn(
                ICON_SIZE,
                'text-blue-600 transition-all duration-fast ease-smooth',
                isActive || hasActiveChild ? 'text-blue-700' : 'group-hover:text-blue-700'
              )} />
            </span>
            {!isCollapsed && (
              <>
                <span className={cn(
                  'truncate transition-all duration-fast ease-smooth flex-1 text-left',
                  isActive || hasActiveChild ? 'font-medium' : 'group-hover:font-medium'
                )}>
                  {item.label}
                </span>
                {isServicesExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-fast ease-smooth group-hover:opacity-100" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-fast ease-smooth group-hover:opacity-100" />
                )}
              </>
            )}
          </Button>
          {isServicesExpanded && (
            <div className={cn(
              'space-y-0.5',
              isCollapsed ? 'hidden' : 'ml-8 border-l-2 border-gray-200 pl-4'
            )}>
              {item.children.map((child) => {
                const isChildActive = pathname === child.href;
                return (
                  <Button
                    key={child.href}
                    variant={isChildActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'group w-full justify-start gap-3 min-h-[40px] py-2 h-auto font-normal rounded-lg transition-all duration-fast ease-smooth text-sm',
                      isChildActive
                        ? 'bg-blue-50 text-blue-900 shadow-sm scale-[0.98]'
                        : 'text-gray-600 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]'
                    )}
                    onClick={() => handleNavigate(child.href)}
                    title={child.label}
                  >
                    <span className="truncate transition-all duration-fast ease-smooth flex-1 text-left">
                      {child.label}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={`group ${isCollapsed ? 'w-full justify-center px-0 min-h-[44px]' : NAV_BUTTON_CLASS} ${
          isActive
            ? 'bg-gray-100 text-gray-900 shadow-sm scale-[0.98]'
            : 'text-gray-700 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]'
        }`}
        onClick={() => handleNavigate(item.href)}
        title={item.label}
      >
        <span className={`${isCollapsed ? 'flex' : ICON_CONTAINER_WIDTH} shrink-0 items-center justify-center transition-transform duration-fast ease-smooth ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
          <Icon className={`${ICON_SIZE} text-blue-600 transition-all duration-fast ease-smooth ${isActive ? 'text-blue-700' : 'group-hover:text-blue-700'}`} />
        </span>
        {!isCollapsed && (
          <span className={`truncate transition-all duration-fast ease-smooth ${isActive ? 'font-medium' : 'group-hover:font-medium'}`}>
            {item.label}
          </span>
        )}
      </Button>
    );
  };

  return (
    <aside
      className="flex flex-col w-full h-full border-r border-gray-200 bg-white overflow-y-auto z-30"
      role="navigation"
      aria-label="Admin navigation"
    >
      <SidebarTopBar
        sectionTitle={SECTION_TITLE}
        isCollapsed={isCollapsed}
        onExpand={handleExpand}
        onCollapseOrClose={handleCollapseOrClose}
      />

      <div className={`flex flex-1 flex-col min-h-0 transition-all duration-smooth ease-smooth ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <nav className="space-y-0.5 flex-1">
          {visibleItems.map((item, index) => (
            <div
              key={item.href}
              className="animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
            >
              {renderNavItem(item)}
            </div>
          ))}
        </nav>
      </div>

      <div className={`mt-auto border-t border-gray-200 shrink-0 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] transition-all duration-fast ease-smooth cursor-pointer ${isCollapsed ? 'justify-center p-1' : 'gap-3 p-2'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-semibold transition-all duration-fast ease-smooth hover:bg-gray-300 hover:scale-110">
            {user?.firstName || user?.lastName ? (
              <span className="text-xs font-semibold">{initials}</span>
            ) : (
              <UserCircle2 className="h-5 w-5 transition-transform duration-fast ease-smooth" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 transition-opacity duration-fast ease-smooth">
              <div className="text-sm font-medium truncate text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.role?.replace('_', ' ') || 'admin'}
              </div>
            </div>
          )}
        </div>
        <div className={isCollapsed ? 'pt-1' : 'pt-2'}>
          <Button
            variant="outline"
            className={`group w-full transition-all duration-fast ease-smooth hover:bg-red-50 hover:border-red-200 hover:text-red-700 active:bg-red-100 active:scale-[0.98] ${isCollapsed ? 'justify-center px-0 min-h-[44px]' : `justify-start gap-3 ${NAV_BUTTON_CLASS}`}`}
            onClick={handleLogout}
            title="Logout"
          >
            <span className={`${isCollapsed ? 'flex' : ICON_CONTAINER_WIDTH} shrink-0 items-center justify-center transition-transform duration-fast ease-smooth group-hover:scale-110`}>
              <LogOut className={`${ICON_SIZE} transition-transform duration-fast ease-smooth group-hover:rotate-12`} />
            </span>
            {!isCollapsed && <span className="transition-all duration-fast ease-smooth">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
