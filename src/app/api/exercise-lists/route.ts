// src/app/api/exercise-lists/route.ts
import { NextResponse } from 'next/server';

import { getAllExerciseLists } from '@/services/exercise.service';
import { ServiceError } from '@/types/index';

export async function GET() {
  try {
    const lists = await getAllExerciseLists();

    return NextResponse.json(lists);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('Error fetching exercise lists:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch exercise lists' },
      { status: 500 }
    );
  }
}
