// src/app/api/notebook/entries/[entryId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { deleteNotebookEntry,getNotebookEntry, updateNotebookEntry } from '@/services/notebook.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const entry = await getNotebookEntry(entryId);

    return NextResponse.json(entry);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch notebook entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    const updateData = await request.json();

    const updatedEntry = await updateNotebookEntry(entryId, updateData);

    return NextResponse.json(updatedEntry);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update notebook entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await context.params;
    await deleteNotebookEntry(entryId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete notebook entry' },
      { status: 500 }
    );
  }
}