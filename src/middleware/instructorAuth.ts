// src/middleware/instructorAuth.ts
import { verify } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { isInstructorForStudio } from '@/services/studio.service';
import { getUserByEmail } from '@/services/user.service';

export async function instructorAuthMiddleware(
  request: NextRequest,
  studioId: string
) {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        )
      };
    }

    // Verify token and extract user info
    const jwtSecret = process.env.JWT_SECRET || '';
    const decoded = verify(token, jwtSecret) as { email: string; userType: string };

    if (!decoded || decoded.userType !== 'instructor') {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: 'Unauthorized: Instructor access required' },
          { status: 403 }
        )
      };
    }

    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        )
      };
    }

    if (!studioId) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: 'Missing studio ID' },
          { status: 400 }
        )
      };
    }

    // Check if instructor has access to this studio
    const hasAccess = await isInstructorForStudio(String(user.user.id), studioId)
    if (!hasAccess) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, message: 'Unauthorized: No access to this studio' },
          { status: 403 }
        )
      };
    }

    // Successfully authorized
    return {
      authorized: true,
      user: user.user
    };
  } catch (error) {
    console.error('Auth middleware error:', error);

    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: 'Authentication error' },
        { status: 401 }
      )
    };
  }
}