// src/app/api/lessons/[lessonId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { deleteLesson, getLesson, updateLesson } from '@/services/lesson.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await context.params;

    const lesson = await getLesson(lessonId);

    return NextResponse.json(lesson );
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await context.params;
    const data = await request.json();

    const lesson = await updateLesson(lessonId, data);

    return NextResponse.json({ success: true, data: lesson });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } =  await context.params;
    await deleteLesson(lessonId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}