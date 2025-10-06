// src/app/api/instructors/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { deleteStudioInstructor } from '@/services/instructor.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { studioInstructorId } = await request.json();
    await deleteStudioInstructor(studioInstructorId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete instructor' },
      { status: 500 }
    );
  }
}