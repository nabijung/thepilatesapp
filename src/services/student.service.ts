// src/services/student.service.ts
import { supabase } from '@/lib/supabase';

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { UserType } from '@/types/index';
// import { Student as StudentModel } from '@/types/models';

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  age: number | null;
  height: number | string | null;
  weight: number | string | null;
  pathologies: string | null;
  occupation: string | null;
  created_at: string;
  updated_at: string;
  birthday?: string;
  profile_picture_url?: string | null;
}

/**
 * Get a student by ID
 */
export const getStudentById = async (studentId: string): Promise<Student | null> => {
  const { data, error } = await supabase
      .from('student')
      .select('*')
      .eq('id', studentId)
      .single();

  if (error) throw error;

  return data;
};

/**
 * Update student details, optionally including studio-specific goals
 */
export const updateStudent = async (
    studentId: string,
    studentData: Partial<Student> & {
      goals?: string | null;
      studioStudentId?: string;
    }
): Promise<Student> => {
  // Create a copy of the data to avoid modifying the original
  const processedData = { ...studentData };

  // Remove goals and studioStudentId as they don't belong in the student table
  const { goals, studioStudentId, ...basicStudentData } = processedData;

  // Convert empty birthday string to null
  if ((basicStudentData as any).birthday === '') {
    (basicStudentData as any).birthday = null;
  }

  // Convert other empty strings to null as needed
  if ((basicStudentData as any).pathologies === '') {
    (basicStudentData as any).pathologies = null;
  }

  if ((basicStudentData as any).occupation === '') {
    (basicStudentData as any).occupation = null;
  }

  // Update the student record
  const { data, error } = await supabase
      .from('student')
      .update(basicStudentData)
      .eq('id', studentId)
      .select()
      .single();

  if (error) throw error;

  // If goals and studioStudentId are provided, update the studio_student relationship
  if (goals !== undefined && studioStudentId) {
    const { error: relationError } = await supabase
        .from('studio_student')
        .update({ goals })
        .eq('studio_student_id', studioStudentId);

    if (relationError) throw relationError;
  }

  return data;
};

/**
 * Get students for a studio
 */
export const getStudioStudents = async (studioId: string): Promise<Student[]> => {
  const { data, error } = await supabase
      .from('studio_student')
      .select('student_id')
      .eq('studio_id', studioId)
      .eq('is_approved', true);

  if (error) throw error;

  if (data && data.length > 0) {
    const studentIds = data.map(item => item.student_id);

    const { data: students, error: studentError } = await supabase
        .from('student')
        .select('*')
        .in('id', studentIds);

    if (studentError) throw studentError;

    return students || [];
  }

  return [];
};



/**
 * Create a student account by instructor
 * This creates a student account with a random password and associates them with the studio
 */
export const createStudentByInstructor = async (
    studioId: string,
    firstName: string,
    lastName: string,
    email: string
): Promise<{ student: Student; studioStudentId: string }> => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();

  // Check if student already exists
  const { data: existingStudent, error: checkError } = await supabase
      .from('student')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  let studentId: string;

  if (existingStudent) {
    // Student exists, use their ID
    studentId = existingStudent.id;
  } else {
    // Generate a temporary random password (will be changed by student on first login)
    const randomPassword = randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create new student
    const { data: newStudent, error: createError } = await supabase
        .from('student')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: normalizedEmail,
          password: hashedPassword,
          temp_password: true // Mark as having a temporary password
        })
        .select()
        .single();

    if (createError) {
      throw createError;
    }

    studentId = newStudent.id;
  }

  // Check if student-studio relationship already exists
  const { data: existingRelation, error: relationCheckError } = await supabase
      .from('studio_student')
      .select('studio_student_id')
      .eq('student_id', studentId)
      .eq('studio_id', studioId)
      .single();

  if (relationCheckError && relationCheckError.code !== 'PGRST116') {
    throw relationCheckError;
  }

  if (existingRelation) {
    // Relationship exists, return student with relation ID
    const { data: student, error: fetchError } = await supabase
        .from('student')
        .select('*')
        .eq('id', studentId)
        .single();

    if (fetchError) {
      throw fetchError;
    }

    return {
      student,
      studioStudentId: existingRelation.studio_student_id
    };
  }

  // Create new studio-student relationship
  const { data: relation, error: relationError } = await supabase
      .from('studio_student')
      .insert({
        student_id: studentId,
        studio_id: studioId,
        is_approved: true // Auto-approve students added by instructors
      })
      .select()
      .single();

  if (relationError) {
    throw relationError;
  }

  // Fetch the full student record
  const { data: student, error: fetchError } = await supabase
      .from('student')
      .select('*')
      .eq('id', studentId)
      .single();

  if (fetchError) {
    throw fetchError;
  }

  // TODO: Send email notification to student with login instructions
  // This would be implemented with your email service

  return {
    student,
    studioStudentId: relation.studio_student_id
  };
};


/**
 * Updates an existing user with a new password when they sign up through the manual process
 * Requires a valid studioId for students
 */
export const setPasswordForExistingUser = async (
    email: string,
    password: string,
    userType: UserType,
    studioId: string | null // Studio ID (full UUID) already validated in the API route
): Promise<unknown> => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  // Skip studio validation since it's already done in the API route

  // Update user password based on type
  if (userType === 'student') {
    const { data: student, error: updateError } = await supabase
        .from('student')
        .update({
          password: hashedPassword,
          temp_password: false
        })
        .eq('email', normalizedEmail)
        .select()
        .single();

    if (updateError) throw updateError;

    // If studioId provided, link student to studio (if not already linked)
    if (studioId) {
      // Check if relationship already exists
      const { data: existingRelation } = await supabase
          .from('studio_student')
          .select('*')
          .eq('student_id', student.id)
          .eq('studio_id', studioId)
          .single();

      if (!existingRelation) {
        // Create new relationship
        await supabase
            .from('studio_student')
            .insert({
              student_id: student.id,
              studio_id: studioId,
              is_approved: false // Require approval for self-signup
            });
      }
    }

    return student;
  } else {
    // Handle instructor password update
    const { data: instructor, error: updateError } = await supabase
        .from('instructor')
        .update({
          password: hashedPassword,
          temp_password: false
        })
        .eq('email', normalizedEmail)
        .select()
        .single();

    if (updateError) throw updateError;

    // If studioId provided, link instructor to studio (if not already linked)
    if (studioId) {
      // Check if relationship already exists
      const { data: existingRelation } = await supabase
          .from('studio_instructor')
          .select('*')
          .eq('instructor_id', instructor.id)
          .eq('studio_id', studioId)
          .single();

      if (!existingRelation) {
        // Create new relationship
        await supabase
            .from('studio_instructor')
            .insert({
              instructor_id: instructor.id,
              studio_id: studioId,
              is_approved: false // Require approval for self-signup
            });
      }
    }

    return instructor;
  }
};



/**
 * Depreacated;
 * use checkUserExistsByType instead
 * @param email
 * @returns
 */
export const checkUserExists = async (email: string): Promise<{ exists: boolean; userType?: UserType }> => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();

  // Check student table
  const { data: student } = await supabase
      .from('student')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

  if (student) {
    return { exists: true, userType: 'student' };
  }

  // Check instructor table
  const { data: instructor } = await supabase
      .from('instructor')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

  if (instructor) {
    return { exists: true, userType: 'instructor' };
  }

  return { exists: false };
};

/**
 * Check if a user exists in the database by email, with optional user type filter
 * @param email User's email address
 * @param userType Optional - filter by user type (student or instructor)
 * @returns Object indicating if user exists and what type they are
 */
export const checkUserExistsByType = async (
    email: string,
    userType?: UserType
): Promise<{ exists: boolean; userType?: UserType }> => {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();

  // If userType is specified, only check that specific table
  if (userType === 'student') {
    const { data: student } = await supabase
        .from('student')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

    return { exists: !!student, userType: student ? 'student' : undefined };
  }

  if (userType === 'instructor') {
    const { data: instructor } = await supabase
        .from('instructor')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

    return { exists: !!instructor, userType: instructor ? 'instructor' : undefined };
  }

  // If no userType is specified, check both tables
  // First check student table
  const { data: student } = await supabase
      .from('student')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

  if (student) {
    return { exists: true, userType: 'student' };
  }

  // Then check instructor table
  const { data: instructor } = await supabase
      .from('instructor')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

  if (instructor) {
    return { exists: true, userType: 'instructor' };
  }

  return { exists: false };
};