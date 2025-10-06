// src/app/api/students/[studentId]/studios/[studioId]/relationship/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getStudioStudentRelationship } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string; studioId: string }> }
) {
  try {
    const params = await context.params;
    const { studentId, studioId } = params;

    const relationship = await getStudioStudentRelationship(studentId, studioId);

    if (!relationship) {
      return NextResponse.json(
        { success: false, message: 'Studio relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(relationship);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch studio relationship' },
      { status: 500 }
    );
  }
}