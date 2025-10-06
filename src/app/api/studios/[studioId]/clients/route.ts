// src/app/api/studios/[studioId]/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getStudioClients } from '@/services/client.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studioId: string }> }
) {
  try {
    const { studioId } = await context.params;
    const clients = await getStudioClients(studioId);

    return NextResponse.json(clients);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}