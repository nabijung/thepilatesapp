// src/app/api/auth/check-user/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { checkUserExistsByType } from '@/services/student.service';
import { ServiceError, UserType } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userType } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Use the userType if provided, otherwise check both types
    const result = userType
      ? await checkUserExistsByType(email, userType as UserType)
      : await checkUserExistsByType(email);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to check user existence' },
      { status: 500 }
    );
  }
}