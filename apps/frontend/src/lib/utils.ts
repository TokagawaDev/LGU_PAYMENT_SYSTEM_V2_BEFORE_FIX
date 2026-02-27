import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Client-side cookie management utilities
 */
export const cookieUtils = {
  /**
   * Get a cookie value by name
   */
  get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    
    return null;
  },

  /**
   * Set a cookie
   */
  set(name: string, value: string, days = 7): void {
    if (typeof document === 'undefined') return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  },

  /**
   * Remove a cookie by setting it to expire
   */
  remove(name: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
  },

  /**
   * Clear all authentication-related cookies
   */
  clearAuthCookies(): void {
    this.remove('access-token');
    this.remove('refresh-token');
    // No non-HTTP-only role cookie
  }
}; 