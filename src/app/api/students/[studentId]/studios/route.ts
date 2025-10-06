// src/app/api/students/[studentId]/studios/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getStudentStudios } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> } // Correct usage
) {
  try {
    const params = await context.params; // Explicitly awaiting `params`
    const studentId = params.studentId;

    const studios = await getStudentStudios(studentId);

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
