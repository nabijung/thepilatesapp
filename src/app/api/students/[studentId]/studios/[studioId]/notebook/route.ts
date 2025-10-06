// src/app/api/students/[studentId]/studios/[studioId]/notebook/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getNotebookEntries } from '@/services/notebook.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string, studioId: string }> }
) {
  try {
    const { studentId, studioId } = await context.params;

    const notebook = await getNotebookEntries(studentId, studioId);

    return NextResponse.json(notebook);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch notebook entries' },
      { status: 500 }
    );
  }
}