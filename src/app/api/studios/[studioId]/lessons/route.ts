// src/app/api/studios/[studioId]/lessons/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { addLesson, getStudioLessons } from '@/services/lesson.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studioId: string }> }
) {
  try {
    const {studioId} = await context.params;
    const lessons = await getStudioLessons(studioId);

    return NextResponse.json(lessons);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studioId: string }> }
) {
  try {
    const {studioId} = await context.params;
    const lessonData = await request.json();

    const { studioId: _, ...cleanedLessonData } = lessonData;

   const data = await addLesson(cleanedLessonData, studioId)

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to create lesson' },
      { status: 500 }
    );
  }
}