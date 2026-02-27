'use client';

import { Button } from '@/components/ui/button';
import { useOptionalAdminShell } from '@/components/molecules/admin-shell-context';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, LogOut, Shield, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ComponentType } from 'react';

export interface AdminHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  icon?: ComponentType<{ className?: string }>;
  showLogout?: boolean;
  onBack?: () => void;
}

/**
 * Reusable header for admin pages with optional back navigation and logout action.
 */
export default function AdminHeader({
  title,
  backHref,
  backLabel = 'Back',
  icon: Icon = Shield,
  showLogout = false,
  onBack,
}: AdminHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const shell = useOptionalAdminShell();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.push(backHref || ROUTES.ADMIN.DASHBOARD);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
      router.push(ROUTES.ADMIN.LOGIN);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            {shell ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shell.toggleSidebar()}
                className="mr-1 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            ) : backHref ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{backLabel}</span>
              </Button>
            ) : null}
            <Icon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          {showLogout && (
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
