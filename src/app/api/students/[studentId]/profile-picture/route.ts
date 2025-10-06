import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/services/auth.service';
import { getStudentById, updateStudent } from '@/services/student.service';
import { uploadProfilePicture, validateFile } from '@/services/storage.service';
import { ServiceError } from '@/types/index';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
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

    // Access params properly
    const { studentId } = await context.params;

    // Check if user is authorized to upload a profile picture
    if (user.userType !== 'student' || String(user.user.id) !== String(studentId)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
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
    const uploadResult = await uploadProfilePicture(file, studentId);

    // Update student profile with the URL
    const updatedStudent = await updateStudent(studentId, {
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