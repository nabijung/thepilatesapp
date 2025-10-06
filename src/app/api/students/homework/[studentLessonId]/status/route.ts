// src/app/api/students/homework/[studentLessonId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { updateHomeworkStatus } from '@/services/lesson.service';
import { ServiceError } from '@/types/index';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ studentLessonId: string }> }
) {
  try {
    const { studentLessonId } = await context.params;
    const { isCompleted } = await request.json();

    const homework = await updateHomeworkStatus(studentLessonId, isCompleted);

    return NextResponse.json(homework);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update homework status' },
      { status: 500 }
    );
  }
}