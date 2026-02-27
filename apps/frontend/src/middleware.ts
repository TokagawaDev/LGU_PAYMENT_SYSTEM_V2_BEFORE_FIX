import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ROUTES, PRIVATE_USER_ROUTES, PRIVATE_ADMIN_ROUTES, ROUTES } from './constants/routes';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const PUBLIC_FILES = [
  '/sitemap.xml',
  '/robots.txt',
  '/favicon.ico',
];

/**
 * Helper function to check if a pathname matches a route pattern
 * Handles both exact matches and dynamic routes with parameters
 */
function matchesRoute(pathname: string, route: string): boolean {
  // Handle dynamic routes like /services/[serviceId]
  if (pathname.startsWith('/services/') && route === ROUTES.SERVICES) {
    return true;
  }
  // Allow receipt step query to pass
  if (pathname.startsWith('/services/')) {
    return pathname.startsWith('/services/');
  }
  // Admin custom forms: /local/admin/settings/custom-forms/new, [id]/edit, [id]/preview
  if (route === ROUTES.ADMIN.SETTINGS_CUSTOM_FORMS && pathname.startsWith(route)) {
    return true;
  }

  return pathname === route;
}

/**
 * Middleware function to handle authentication and route protection
 * Uses PUBLIC_ROUTES, PRIVATE_USER_ROUTES, and PRIVATE_ADMIN_ROUTES to control access
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get('access-token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;
  const { pathname } = request.nextUrl;

  // Allow access to SEO and public files
  if (PUBLIC_FILES.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow access to Next.js assets and public directory
  if (pathname.includes('/_next') || 
      pathname.includes('/favicon.ico') ||
      pathname.startsWith('/images/') ||  
      pathname.startsWith('/public/')) {  
    return NextResponse.next();
  }

  // Check if route is explicitly public
  const isPublicRoute = PUBLIC_ROUTES.some(route => matchesRoute(pathname, route));
  
  if (isPublicRoute) {
    // Special case: redirect logged-in users from home page or admin login to the appropriate dashboard
    if ((pathname === ROUTES.HOME || pathname === ROUTES.ADMIN.LOGIN) && accessToken) {
      try {
        const cookieHeaderParts: string[] = [];
        if (accessToken) cookieHeaderParts.push(`access-token=${accessToken}`);
        if (refreshToken) cookieHeaderParts.push(`refresh-token=${refreshToken}`);
        const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-token`, {
          method: 'GET',
          headers: {
            // Forward auth cookies to backend
            cookie: cookieHeaderParts.join('; '),
          },
        });
        if (verifyResponse.ok) {
          const data = await verifyResponse.json();
          const role = data?.user?.role as 'super_admin' | 'admin' | 'user' | undefined;
          if (role === 'admin' || role === 'super_admin') {
            return NextResponse.redirect(new URL(ROUTES.ADMIN.DASHBOARD, request.url));
          }
          if (role === 'user') {
            return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
          }
        }
      } catch {
        // Ignore failures; fall through to next()
      }
    }
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isUserRoute = PRIVATE_USER_ROUTES.some(route => matchesRoute(pathname, route));
  const isAdminRoute = PRIVATE_ADMIN_ROUTES.some(route => matchesRoute(pathname, route));
  
  // If it's a private route (user or admin)
  if (isUserRoute || isAdminRoute) {
    const isAuthenticated = Boolean(accessToken);
    if (!isAuthenticated) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = isAdminRoute
        ? new URL(ROUTES.ADMIN.LOGIN, request.url)
        : new URL(ROUTES.HOME, request.url);
      url.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(url);
    }

    // Verify token and role on the server
    try {
      const cookieHeaderParts: string[] = [];
      if (accessToken) cookieHeaderParts.push(`access-token=${accessToken}`);
      if (refreshToken) cookieHeaderParts.push(`refresh-token=${refreshToken}`);
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: 'GET',
        headers: {
          cookie: cookieHeaderParts.join('; '),
        },
      });

      if (!verifyResponse.ok) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = isAdminRoute
          ? new URL(ROUTES.ADMIN.LOGIN, request.url)
          : new URL(ROUTES.HOME, request.url);
        url.searchParams.set('callbackUrl', encodeURI(pathname));
        return NextResponse.redirect(url);
      }

      const data = await verifyResponse.json();
      const role = data?.user?.role as 'super_admin' | 'admin' | 'user' | undefined;

      if (isAdminRoute && role !== 'admin' && role !== 'super_admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }
        return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
      }

      if (isUserRoute) {
        // Block admin/super_admin from user-only sections (custom form creation is under admin settings)
        if (role === 'admin' || role === 'super_admin') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden - User access required' }, { status: 403 });
          }
          return NextResponse.redirect(new URL(ROUTES.ADMIN.DASHBOARD, request.url));
        }
        if (role !== 'user') {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden - User access required' }, { status: 403 });
          }
          return NextResponse.redirect(new URL(ROUTES.HOME, request.url));
        }
      }

      return NextResponse.next();
    } catch {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const url = isAdminRoute
        ? new URL(ROUTES.ADMIN.LOGIN, request.url)
        : new URL(ROUTES.HOME, request.url);
      url.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(url);
    }
  }

  if (!accessToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(ROUTES.HOME, request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|public|favicon.ico).*)'],
};
