// src/app/api/studios/[studioId]/instructors/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getStudioInstructors } from '@/services/instructor.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studioId: string }> }
) {
  try {
    const { studioId } = await context.params;
    const instructors = await getStudioInstructors(studioId);

    return NextResponse.json(instructors);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}