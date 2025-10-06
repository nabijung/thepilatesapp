// src/app/api/clients/goals/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { updateClientGoals } from '@/services/client.service';
import { ServiceError } from '@/types/index';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studioStudentId, goals } = body;

    if (!studioStudentId) {
      return NextResponse.json(
        { success: false, message: 'Missing studioStudentId' },
        { status: 400 }
      );
    }

    const data = await updateClientGoals(studioStudentId, goals || '');

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('Error updating client goals:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update goals' },
      { status: 500 }
    );
  }
}