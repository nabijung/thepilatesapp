// src/app/api/students/homework/[studentLessonId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { deleteHomework, updateHomework } from '@/services/lesson.service';
import { ServiceError } from '@/types/index';

// DELETE handler for deleting homework
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studentLessonId: string }> }
) {
  try {
    const { studentLessonId } = await context.params;

    await deleteHomework(studentLessonId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete homework' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating homework
export async function PATCH(
  request: NextRequest,
context: { params: Promise<{ studentLessonId: string }> }
) {
  try {
    const { studentLessonId } = await context.params;
    const { isCompleted, lessonId } = await request.json();

    const updates: any = {};

    console.log('updates ',updates)

    // Only add fields that are provided
    if (isCompleted !== undefined) updates.is_completed = isCompleted;
    // if (date) updates.assigned_date = date;
    if (lessonId) updates.lesson_id = lessonId;

    await updateHomework(studentLessonId, updates);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update homework' },
      { status: 500 }
    );
  }
}