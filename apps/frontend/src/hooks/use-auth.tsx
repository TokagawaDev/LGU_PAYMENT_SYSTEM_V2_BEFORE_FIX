'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { UserResponse } from '@/lib/api';
import { verifyToken, logoutUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { cookieUtils } from '@/lib/utils';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: UserResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  /**
   * Login user and store authentication state
   */
  const login = (userData: UserResponse) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Logout user and clear authentication state
   */
  const logout = useCallback(async () => {
    const currentUser = user;

    try {
      await logoutUser();
    } catch {
      // Continue with cleanup even if server logout fails
    } finally {
      // Clear all authentication state
      setUser(null);
      localStorage.removeItem('user');
      // No token stored in localStorage in cookie-only mode

      // Clear any other auth-related storage
      if (typeof window !== 'undefined') {
        // Clear any session storage items
        sessionStorage.removeItem('user');
        // No token stored in sessionStorage in cookie-only mode

        // Clear authentication cookies
        cookieUtils.clearAuthCookies();
      }

      // Role-based redirect with a small delay to ensure state is cleared
      setTimeout(() => {
        if (
          currentUser?.role === 'admin' ||
          currentUser?.role === 'super_admin'
        ) {
          router.push(ROUTES.ADMIN.LOGIN);
        } else {
          router.push(ROUTES.HOME);
        }
      }, 100);
    }
  }, [router, user]);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await verifyToken();
      if (response.valid) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        await logout();
      }
    } catch {
      await logout();
    }
  }, [logout]);

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // Verify cookie-based session is still valid
        try {
          const response = await verifyToken();
          if (response.valid) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
          } else {
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch {
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Set up token refresh interval
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh token every 10 minutes
    const interval = setInterval(async () => {
      try {
        await refreshUser();
      } catch {
        //
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push(ROUTES.HOME);
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return auth;
}
