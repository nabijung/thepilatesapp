// src/app/api/instructors/[instructorId]/studios/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getInstructorStudios } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ instructorId: string }> } // Using `context` instead of direct destructuring
) {
  try {
    const {instructorId} = await context.params; // Access params correctly
    const studios = await getInstructorStudios(instructorId);

    return NextResponse.json(studios);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch studios' },
      { status: 500 }
    );
  }
}
