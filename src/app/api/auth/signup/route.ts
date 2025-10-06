// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { signUpUser } from '@/services/auth.service';
import { ServiceError,UserType } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      userType,
      firstName,
      lastName,
      studioId,
      studioName,
      studioLocation,
      age,
      height,
      weight,
      pathologies,
      occupation
    } = body;

    if (!email || !password || !userType || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate user type
    if (!['student', 'instructor'].includes(userType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user type' },
        { status: 400 }
      );
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      studioId,
      studioName,
      studioLocation,
      age,
      height,
      weight,
      pathologies,
      occupation
    };

    const data = await signUpUser(userType as UserType, userData);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API signup error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}