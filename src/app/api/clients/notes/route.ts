// src/app/api/clients/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { updateClientInstructorNotes } from '@/services/client.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studioStudentId, notes } = body;

    if (!studioStudentId) {
      return NextResponse.json(
        { success: false, message: 'Missing studioStudentId' },
        { status: 400 }
      );
    }

    const data = await updateClientInstructorNotes(studioStudentId, notes || '');

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error updating client notes:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update notes' },
      { status: 500 }
    );
  }
}