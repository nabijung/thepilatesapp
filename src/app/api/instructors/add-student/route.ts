// src/app/api/instructors/add-student/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { instructorAuthMiddleware } from '@/middleware/instructorAuth';
import { createStudentByInstructor } from '@/services/student.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { firstName, lastName, email, studioId } = body;

    if (!firstName || !lastName || !email || !studioId) {
      return NextResponse.json(
          { success: false, message: 'Missing required fields' },
          { status: 400 }
      );
    }

    // Verify the instructor has access to this studio
    const auth = await instructorAuthMiddleware(request, studioId);
    if (!auth.authorized) {
      return auth.response;
    }

    // Create the student
    const result = await createStudentByInstructor(studioId, firstName, lastName, email);

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: result.student.id,
          first_name: result.student.first_name,
          last_name: result.student.last_name,
          email: result.student.email
        },
        studioStudentId: result.studioStudentId
      }
    });
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error(`[add-student] API error:`, error);

    return NextResponse.json(
        { success: false, message: err.message || 'Failed to add student' },
        { status: 500 }
    );
  }
}