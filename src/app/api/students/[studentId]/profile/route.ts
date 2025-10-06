//src/app/api/students/[studentId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/services/auth.service';
import { getStudentById, updateStudent } from '@/services/student.service';
import { ServiceError } from '@/types/index';
import { Student } from '@/types/models';

interface StudentProfileUpdate {
  birthday?: string | null;
  height?: number | null;
  weight?: number | null;
  pathologies?: string | null;
  occupation?: string | null;
  goals?: string | null;
  studioStudentId?: string;
  email?: string;
  profile_picture_url?: string | null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> } // Correct function signature
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
    const {studentId} = await context.params;

    // Check if the user is authorized to access this profile
    if (user.userType !== 'student' && user.userType !== 'instructor') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (user.userType === 'student' && String(user.user.id) !== String(studentId)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch the student profile
    const student = await getStudentById(studentId);

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { password, ...studentWithoutPassword } = student as any;

    return NextResponse.json(studentWithoutPassword);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch student profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const {studentId} = await context.params;

    // Only allow students to update their own profile
    if (user.userType !== 'student' || String(user.user.id) !== String(studentId)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }


    // Get the request body
    const profileData : StudentProfileUpdate = await request.json();

    // Prevent changing email
    if (profileData.email && profileData.email !== user.user.email) {
      return NextResponse.json(
        { success: false, message: 'Email cannot be changed' },
        { status: 400 }
      );
    }

    // Update the student profile, including any studio-specific data
    const updatedStudent = await updateStudent(studentId, {
      birthday: profileData.birthday,
      height: profileData.height,
      weight: profileData.weight,
      pathologies: profileData.pathologies,
      occupation: profileData.occupation,
      // Include studio-specific fields if provided
      goals: profileData.goals,
      studioStudentId: profileData.studioStudentId,
      profile_picture_url: profileData.profile_picture_url
    })

    if (!updatedStudent) {
      return NextResponse.json(
        { success: false, message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Remove sensitive data
    const { password, ...studentWithoutPassword } = updatedStudent as any;

    return NextResponse.json(studentWithoutPassword);
  } catch (error: unknown) {
    const err = error as ServiceError;
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update student profile' },
      { status: 500 }
    );
  }
}
