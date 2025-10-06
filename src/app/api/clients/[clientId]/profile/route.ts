// src/app/api/clients/[clientId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { instructorAuthMiddleware } from '@/middleware/instructorAuth';
import { getClientDetails } from '@/services/client.service';
import { updateStudent } from '@/services/student.service';
import { ServiceError } from '@/types/index';

interface ClientProfileUpdate {
  birthday?: string | null;
  height?: string | null;
  weight?: string | null;
  pathologies?: string | null;
  occupation?: string | null;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await context.params;

    // Get studio ID from query parameter
    const url = new URL(request.url);
    const studioId = url.searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json(
        { success: false, message: 'Missing studioId parameter' },
        { status: 400 }
      );
    }

    // Check authorization
    const auth = await instructorAuthMiddleware(request, studioId);
    if (!auth.authorized) {
      return auth.response;
    }

    // Verify the instructor has access to this client
    try {
      const client = await getClientDetails(clientId, studioId);
      if (!client) {
        return NextResponse.json(
          { success: false, message: 'Client not found or access denied' },
          { status: 404 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access to this client' },
        { status: 403 }
      );
    }

    // Get the request body
    const profileData: ClientProfileUpdate = await request.json();

    // Update the client profile
    const updatedClient = await updateStudent(clientId, {
      birthday: profileData.birthday,
      height: profileData.height,
      weight: profileData.weight,
      pathologies: profileData.pathologies,
      occupation: profileData.occupation,
    });

    if (!updatedClient) {
      return NextResponse.json(
        { success: false, message: 'Failed to update client profile' },
        { status: 500 }
      );
    }

    // Return the updated client details
    const updatedClientDetails = await getClientDetails(clientId, studioId);
    return NextResponse.json(updatedClientDetails);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update client profile' },
      { status: 500 }
    );
  }
}