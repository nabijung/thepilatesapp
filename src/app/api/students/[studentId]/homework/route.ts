// src/app/api/students/[studentId]/homework/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getStudentLessons, assignLessonToStudent } from '@/services/lesson.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await context.params;
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json(
        { success: false, message: 'Studio ID is required' },
        { status: 400 }
      );
    }

    const homework = await getStudentLessons(studentId, studioId);

    return NextResponse.json(homework);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch homework' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await context.params;
    const { lessonId, date } = await request.json();

    const homework = await assignLessonToStudent(lessonId, studentId, date);

    return NextResponse.json(homework);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to assign homework' },
      { status: 500 }
    );
  }
}