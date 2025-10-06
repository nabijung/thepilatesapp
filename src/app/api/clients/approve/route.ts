// src/app/api/instructors/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { approveClient } from '@/services/client.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const { studioStudentId } = await request.json();

    await approveClient(studioStudentId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to approve instructor' },
      { status: 500 }
    );
  }
}