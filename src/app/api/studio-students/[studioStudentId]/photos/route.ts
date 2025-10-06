// src/app/api/studio-students/[studioStudentId]/photos/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { instructorAuthMiddleware } from '@/middleware/instructorAuth';
import { getStudioIdFromStudioStudent } from '@/services/client.service';
import { getProgressPhotos, addProgressPhoto } from '@/services/photos.service';
import { uploadProgressPhoto, validateFile } from '@/services/storage.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studioStudentId: string }> }
) {
  try {
    const { studioStudentId } = await context.params;

    if (!studioStudentId) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const photos = await getProgressPhotos(studioStudentId);

    return NextResponse.json(photos);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error fetching progress photos:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch progress photos' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studioStudentId: string }> }
) {
  try {
    const { studioStudentId } = await context.params;

    // Get the studioId from the studioStudentId
    const studioId = await getStudioIdFromStudioStudent(studioStudentId);

    if (!studioId) {
      return NextResponse.json(
        { success: false, message: 'Invalid studio student relationship' },
        { status: 400 }
      );
    }

    // Check authorization
    const auth = await instructorAuthMiddleware(request, studioId);
    if (!auth.authorized) {
      return auth.response;
    }

    // Now read the form data AFTER authorization check
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Missing file' },
        { status: 400 }
      );
    }

    // Validate the file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    // Upload the file
    const uploadResult = await uploadProgressPhoto(file, studioStudentId);

    // Save to database
    const photo = await addProgressPhoto(studioStudentId, uploadResult);

    return NextResponse.json(photo);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('Error uploading progress photo:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to upload progress photo' },
      { status: 500 }
    );
  }
}