// src/app/api/auth/set-password/route.ts
import { sign } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { setPasswordForExistingUser } from '@/services/student.service';
import { findStudioByAnyId } from '@/services/studio.service';
import { getUserByEmailAndType } from '@/services/user.service';
import { ServiceError, UserType } from '@/types/index';
import { validate } from 'uuid';

// Generate a JWT token for the user
const generateToken = (email: string, userType: UserType): string => {
  const jwtSecret = process.env.JWT_SECRET || '';
  return sign({ email, userType }, jwtSecret, { expiresIn: '7d' });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, userType, studioId } = body;

    if (!email || !password || !userType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Studio ID is now required for students
    if (userType === 'student' && !studioId) {
      return NextResponse.json(
        { success: false, message: 'Studio ID is required for student accounts' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Verify the user exists
    const user = await getUserByEmailAndType(normalizedEmail, userType);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if((user as any).temp_password == false){
      return NextResponse.json(
        { success: false, message: 'User is not eligible for password update' },
        { status: 400 }
      );
    }

    // Find the studio by short_id or full UUID using the service function
    let fullStudioId: string | null = null;

    if (studioId) {
      fullStudioId = await findStudioByAnyId(studioId);

      if (!fullStudioId) {
        return NextResponse.json(
          { success: false, message: 'Invalid studio ID. The studio does not exist.' },
          { status: 400 }
        );
      }
    }

    // Update the user with the new password
    const updatedUser = await setPasswordForExistingUser(normalizedEmail, password, userType, fullStudioId);

    // Remove sensitive data before returning
    const userWithoutPassword: any = updatedUser ?{ ...updatedUser as object } :{}
    delete userWithoutPassword.password;

    // Generate authentication token
    const token = generateToken(normalizedEmail, userType);

    // Create response with token cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        userType
      }
    });

    // Set authentication cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to set password' },
      { status: 500 }
    );
  }
}