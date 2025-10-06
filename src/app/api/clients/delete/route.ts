// src/app/api/clients/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { deleteStudioStudent } from '@/services/client.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { studioStudentId } = await request.json();
    await deleteStudioStudent(studioStudentId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete client' },
      { status: 500 }
    );
  }
}