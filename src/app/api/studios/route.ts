// src/app/api/studios/route.ts
import { NextResponse } from 'next/server';

import { getAllStudios } from '@/services/studio.service';
import { ServiceError } from '@/types/index';

export async function GET() {
  try {
    const studios = await getAllStudios();

    return NextResponse.json(studios);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error fetching studios:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch studios' },
      { status: 500 }
    );
  }
}