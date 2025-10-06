// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { signInUser } from '@/services/auth.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, userType } = body;

    if (!email || !password || !userType) {
      return NextResponse.json(
        { success: false, message: 'Missing email, password, or user type' },
        { status: 400 }
      );
    }

    // Pass userType to signInUser to verify against the correct table
    const { token, user, userType: confirmedUserType } = await signInUser(email, password, userType);

    // Remove password from user object before returning
    const userWithoutPassword: any = user ? { ...user as object } : {};
    delete userWithoutPassword.password;

    // Create response object
    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        userType: confirmedUserType
      }
    });

    // Set authentication cookie on the response object
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 604800, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const err = error as ServiceError

    return NextResponse.json(
      { success: false, message: err.message || 'Invalid credentials' },
      { status: (error as any).status && typeof (error as any).status === 'number' ? (error as any).status : 401 }
    );
  }
}