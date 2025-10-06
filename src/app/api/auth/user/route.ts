// src/app/api/auth/user/route.ts
import { verify } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { getUserByEmail } from '@/services/user.service';
import { ServiceError } from '@/types/index';

export async function GET(request: NextRequest) {
  try {
    // Get the token from cookies using request.cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify the token
    const jwtSecret = process.env.JWT_SECRET || '';
    const decoded = verify(token, jwtSecret) as { email: string };

    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get the user from the database
    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password from user object before returning
    const userWithoutPassword: any = user?.user ? { ...user.user as object } : {};
    delete userWithoutPassword.password;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        userType: user.userType
      }
    });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Get current user error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Authentication error' },
      { status: 401 }
    );
  }
}