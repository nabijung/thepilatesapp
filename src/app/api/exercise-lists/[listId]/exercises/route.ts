// src/app/api/exercise-lists/[listId]/exercises/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getExercisesByListId } from '@/services/exercise.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await context.params;
    const exercises = await getExercisesByListId(listId);

    return NextResponse.json(exercises);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('Error fetching exercises for list:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}