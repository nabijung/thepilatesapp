// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

import { ServiceError } from '@/types/index';

export async function POST() {
  try {
    // Create response object
    const response = NextResponse.json({ success: true });

    // Clear the auth token cookie on the response object
    response.cookies.set({
      name: 'auth-token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Immediately expire
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Logout error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}