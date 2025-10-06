// src/app/api/studio-students/[studioStudentId]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { instructorAuthMiddleware } from '@/middleware/instructorAuth';
import { getStudioIdFromStudioStudent } from '@/services/client.service';
import { removeProgressPhoto } from '@/services/photos.service';
import { ServiceError } from '@/types/index';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studioStudentId: string; photoId: string }> }
) {
  try {
    const { studioStudentId, photoId } = await context.params;

    // Get the studioId from URL parameters
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      const derivedStudioId = await getStudioIdFromStudioStudent(studioStudentId);
      if (!derivedStudioId) {
        return NextResponse.json(
          { success: false, message: 'Invalid studio student relationship' },
          { status: 400 }
        );
      }

      // Check authorization
      const auth = await instructorAuthMiddleware(request, derivedStudioId);
      if (!auth.authorized) {
        return auth.response;
      }
    } else {
      // Check authorization with provided studioId
      const auth = await instructorAuthMiddleware(request, studioId);
      if (!auth.authorized) {
        return auth.response;
      }
    }

    await removeProgressPhoto(photoId, studioStudentId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error deleting progress photo:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete progress photo' },
      { status: 500 }
    );
  }
}