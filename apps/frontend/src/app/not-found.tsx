'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

/**
 * 404 Not Found page component
 * Provides a user-friendly error page with navigation back to dashboard
 */
export default function NotFound(): React.JSX.Element {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.role === 'admin' || user.role === 'super_admin') {
            setUserRole('admin');
          } else {
            setUserRole('user');
          }
        }
      } catch {
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, []);

  /**
   * Handle navigation to appropriate dashboard based on user role
   */
  const handleGoToDashboard = () => {
    if (userRole === 'admin') {
      router.push(ROUTES.ADMIN.DASHBOARD);
    } else if (userRole === 'user') {
      router.push(ROUTES.DASHBOARD);
    } else {
      // If no user role, go to home page
      router.push(ROUTES.HOME);
    }
  };

  /**
   * Handle navigation back to previous page
   */
  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-4xl font-bold text-blue-600">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It
          might have been moved, deleted, or you entered the wrong URL.
        </p>

        <div className="space-y-4">
          {userRole && (
            <Button onClick={handleGoToDashboard} size="lg" className="w-full">
              Go to Dashboard
            </Button>
          )}

          <Button
            onClick={handleGoBack}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Go Back
          </Button>

          {!userRole && (
            <Button
              onClick={() => router.push(ROUTES.HOME)}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Go to Home
            </Button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact support if this problem persists.
          </p>
        </div>
      </div>
    </div>
  );
}
