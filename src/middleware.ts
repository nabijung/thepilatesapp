// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;
  const tokenData = token ? verifyToken(token) : null;
  const isAuthenticated = !!tokenData;
  // const userType : UserType = tokenData?.user_type;

  // Route classifications
  const protectedRoutes = ['/dashboard', '/clients', '/lessons'];
  const authRoutes = ['/login', '/signup'];
  const apiRoutes = pathname.startsWith('/api/');

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname === route);
  const isRootPath = pathname === '/';

  // Handle API route authentication
  if (apiRoutes) {
    // Skip authentication for certain public API routes (like login/signup)
    const publicApiRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/check-user', '/api/auth/set-password'];
    if (!publicApiRoutes.includes(pathname)) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
  }

  // Existing authentication logic for page routes
  if (!isAuthenticated) {
    // User not authenticated
    if (isProtectedRoute || isRootPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } else {
    // User is authenticated
    if (isAuthRoute || isRootPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Handle invalid token cleanup
  if (token && !isAuthenticated) {
    const response = NextResponse.next();
    response.cookies.delete('auth-token');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/clients/:path*',
    '/lessons/:path*',
    '/login',
    '/signup',
    '/api/:path*'
  ],
};