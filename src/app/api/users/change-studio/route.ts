// src/app/api/users/change-studio/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { changeInstructorStudio, changeStudentStudio } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, studioId } = await request.json();

    if (!userId || !userType || !studioId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (userType === 'student') {
      await  changeStudentStudio(userId, studioId);
    } else if (userType === 'instructor') {
      await changeInstructorStudio(userId, studioId);
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid user type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Studio changed successfully'
    });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error changing studio:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to change studio' },
      { status: 500 }
    );
  }
}