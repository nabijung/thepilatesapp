// src/app/api/instructors/[instructorId]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/services/auth.service';
import { getInstructorById, updateInstructor } from '@/services/instructor.service';
import { ServiceError } from '@/types/index';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ instructorId: string }> }
) {
  try {
    const {instructorId} = await context.params; // Await context params in App Router

    // Get token from request
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow instructors to access their own profile
    if (user.userType !== 'instructor' || String(user.user.id) !== String(instructorId)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch the instructor profile
    const instructor = await getInstructorById(instructorId);
    if (!instructor) {
      return NextResponse.json(
        { success: false, message: 'Instructor not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { password, ...instructorWithoutPassword } = instructor as any;

    return NextResponse.json(instructorWithoutPassword);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch instructor profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ instructorId: string }> }
) {
  try {
    const {instructorId} = await context.params;

    // Get token from request
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow instructors to update their own profile
    if (user.userType !== 'instructor' || user.user.id !== instructorId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the request body
    const profileData = await request.json();

    // Prevent email change
    if (profileData.email && profileData.email !== user.user.email) {
      return NextResponse.json(
        { success: false, message: 'Email cannot be changed' },
        { status: 400 }
      );
    }

    // Update the instructor profile with only allowed fields
    const updatedInstructor = await updateInstructor(instructorId, {
      bio: profileData.bio, // Example: Only allow updating bio
      phoneNumber: profileData.phoneNumber,
      specialization: profileData.specialization,
    });

    if (!updatedInstructor) {
      return NextResponse.json(
        { success: false, message: 'Failed to update instructor profile' },
        { status: 500 }
      );
    }

    // Remove sensitive data
    const { password, ...instructorWithoutPassword } = updatedInstructor as any;

    return NextResponse.json(instructorWithoutPassword);
  } catch (error: unknown) {
    const err = error as ServiceError
    console.error('API error:', error);

    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update instructor profile' },
      { status: 500 }
    );
  }
}
