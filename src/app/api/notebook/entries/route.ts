// src/app/api/notebook/entries/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { addNotebookEntry } from '@/services/notebook.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { studentId, instructorId, studioId, title, contents, exercise_selected, entry_date } = await request.json();

    const entry = await addNotebookEntry(
      studentId,
      instructorId,
      studioId,
      title,
      contents,
      exercise_selected,
      entry_date
    );

    return NextResponse.json(entry);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to add notebook entry' },
      { status: 500 }
    );
  }
}