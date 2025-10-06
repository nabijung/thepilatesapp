// src/app/api/instructors/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { approveInstructor } from '@/services/instructor.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { studioInstructorId } = await request.json();

    await approveInstructor(studioInstructorId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to approve instructor' },
      { status: 500 }
    );
  }
}