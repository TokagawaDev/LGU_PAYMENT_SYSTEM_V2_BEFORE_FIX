import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Handle user logout
 * POST /api/auth/logout
 */
export async function POST(_request: NextRequest) {
  try {
    // Call backend logout endpoint
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Create response
    const result = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear authentication cookies regardless of backend response
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
      expires: new Date(0), // Expire immediately
      path: '/',
      // Set domain for cross-subdomain cookie clearing in production
      ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN && {
        domain: process.env.COOKIE_DOMAIN
      }),
    };

    result.cookies.set('access-token', '', cookieOptions);
    result.cookies.set('refresh-token', '', cookieOptions);

    // Role cookie no longer used

    return result;
  } catch {
    
    // Even if backend logout fails, clear cookies and return success
    const result = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear cookies with same options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
      expires: new Date(0), // Expire immediately
      path: '/',
      // Set domain for cross-subdomain cookie clearing in production
      ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN && {
        domain: process.env.COOKIE_DOMAIN
      }),
    };

    result.cookies.set('access-token', '', cookieOptions);
    result.cookies.set('refresh-token', '', cookieOptions);

    // Role cookie no longer used

    return result;
  }
}
