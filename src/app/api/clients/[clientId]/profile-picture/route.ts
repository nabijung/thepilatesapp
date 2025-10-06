import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/services/auth.service';
import { getClientDetails } from '@/services/client.service';
import { getStudentById, updateStudent } from '@/services/student.service';
import { uploadProfilePicture, validateFile } from '@/services/storage.service';
import { ServiceError } from '@/types/index';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    // Get token from request
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the user from the database
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is an instructor
    if (user.userType !== 'instructor') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Access params properly
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

    // Verify the instructor has access to this client and studio
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

    // Read the form data
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
    const uploadResult = await uploadProfilePicture(file, clientId);

    // Update student profile with the URL
    const updatedStudent = await updateStudent(clientId, {
      profile_picture_url: uploadResult.url
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url
    });
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('Error uploading profile picture:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}