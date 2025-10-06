// src/app/api/exercises/route.ts
import { NextResponse } from 'next/server';

import { getAllExercisesWithLists } from '@/services/exercise.service';
import { ServiceError } from '@/types/index';

export async function GET() {
  try {
    const data = await getAllExercisesWithLists();

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('Error fetching exercises:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}