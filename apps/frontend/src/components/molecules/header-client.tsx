'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut, History, ArrowLeft, Menu, Bell } from 'lucide-react';
import type { PublicSettings } from '@/lib/settings';
import { fetchPublicSettings } from '@/lib/settings';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-hot-toast';
import { useOptionalUserShell } from '@/components/molecules/user-shell-context';
import { useNotificationContext, formatNotificationTime } from '@/components/molecules/notification-context';

interface HeaderProps {
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonRoute?: string;
  showProfileMenu?: boolean;
  userName?: string;
  onProfileMenuAction?: (action: string) => void;
  settings?: PublicSettings;
}

export default function HeaderClient({
  showBackButton = false,
  backButtonText = 'Back',
  backButtonRoute = '/dashboard',
  showProfileMenu = true,
  userName,
  onProfileMenuAction,
  settings,
}: HeaderProps): React.JSX.Element {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [localSettings, setLocalSettings] = useState<PublicSettings | null>(
    settings ?? null
  );
  const shell = useOptionalUserShell();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsReadAndDismiss } = useNotificationContext();

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!localSettings) {
      fetchPublicSettings()
        .then(setLocalSettings)
        .catch(() => {
          // keep skeleton
        });
    }
  }, [localSettings]);

  const displayName = userName || user?.firstName || 'User';

  const handleBackClick = (): void => {
    router.push(backButtonRoute);
  };

  const handleProfileMenuClick = async (action: string): Promise<void> => {
    if (onProfileMenuAction) {
      onProfileMenuAction(action);
      return;
    }
    if (action === 'transaction-history') {
      router.push(ROUTES.TRANSACTION_HISTORY);
    } else if (action === 'settings') {
      router.push(ROUTES.SETTINGS);
    } else if (action === 'logout') {
      try {
        await logout();
        toast.success('Logged out successfully');
      } catch {
        toast.error('Failed to logout');
      }
    }
  };

  if (!localSettings) {
    return (
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md border-b border-gray-200 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo + Names */}
          <div className="flex items-center space-x-4">
            {shell ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shell.toggleSidebar()}
                className="mr-1 md:hidden shrink-0 h-10 w-10 p-0 rounded-lg"
                aria-label={shell.isSidebarOpen ? 'Close menu' : 'Open menu'}
                title={shell.isSidebarOpen ? 'Close menu' : 'Open menu'}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{shell.isSidebarOpen ? 'Close menu' : 'Open menu'}</span>
              </Button>
            ) : null}
            {!shell && showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{backButtonText}</span>
              </Button>
            )}
            <div className="flex-shrink-0">
              <Image
                src={localSettings.assets.sealLogoUrl}
                alt="Municipal Seal"
                width={40}
                height={40}
                className="rounded-full"
                unoptimized
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                {localSettings.city.fullName}
              </h1>
              <p className="text-sm text-gray-600">
                {localSettings.branding.systemName}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notification bell (Citizen Portal) */}
            {shell && (
              <div
                className="relative"
                ref={notificationsRef}
                data-tour="notifications"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotificationsOpen((v) => !v)}
                  className="relative h-10 w-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  aria-label={notificationsOpen ? 'Close notifications' : 'Open notifications'}
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
                {notificationsOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
                    role="menu"
                    aria-label="Notifications"
                  >
                    <div className="border-b border-gray-100 px-4 py-2">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-[min(20rem,60vh)] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          No new notifications
                        </div>
                      ) : (
                        <ul className="py-1">
                          {notifications.map((n) => {
                            const getTitle = (): string => {
                              if (n.type === 'application_update') {
                                return n.addOnTitle;
                              }
                              if (n.type === 'system_alert') {
                                return n.title;
                              }
                              if (n.type === 'payment_update' || n.type === 'transaction_update') {
                                return `Transaction ${n.reference}`;
                              }
                              return 'Notification';
                            };

                            const handleClick = (): void => {
                              markAsReadAndDismiss(n.id);
                              setNotificationsOpen(false);
                              // Navigate based on notification type
                              if (n.type === 'application_update') {
                                router.push(ROUTES.STATUS);
                              } else if (n.type === 'payment_update' || n.type === 'transaction_update') {
                                router.push(ROUTES.TRANSACTION_HISTORY);
                              }
                              // system_alert doesn't navigate anywhere
                            };

                            return (
                              <li key={n.id}>
                                <button
                                  type="button"
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                  onClick={handleClick}
                                >
                                  <p className="text-sm font-medium text-gray-900">
                                    {getTitle()}
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-600">{n.message}</p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {formatNotificationTime(n.createdAt)}
                                  </p>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!shell && showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="flex items-center space-x-2 hover:bg-gray-100 text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:block">{backButtonText}</span>
              </Button>
            )}

            {!shell && showProfileMenu && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100 text-gray-700"
                  onClick={() => handleProfileMenuClick('profile')}
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block">{displayName}</span>
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() =>
                        handleProfileMenuClick('transaction-history')
                      }
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <History className="h-4 w-4 mr-2" />
                      Transaction History
                    </button>
                    <button
                      onClick={() => handleProfileMenuClick('settings')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </button>
                    <button
                      onClick={() => handleProfileMenuClick('logout')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
