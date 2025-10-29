// src/services/user.service.ts (replacing profile.service.ts)
import { supabase } from '@/lib/supabase';
import { UserType } from '@/types/index';
import { Instructor, Student } from '@/types/models';

/**
 * Get student by ID
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
 * Get instructor by ID
 */
export const getInstructorById = async (instructorId: string): Promise<Instructor | null> => {
  const { data, error } = await supabase
      .from('instructor')
      .select('*')
      .eq('id', instructorId)
      .single();

  if (error) throw error;

  return data;
};

/**
 * Get user by email (checks both student and instructor tables)
 */
export const getUserByEmail = async (email: string): Promise<{ userType: UserType, user: Student | Instructor } | null> => {
  // Check student table first
  const { data: student, error: studentError } = await supabase
      .from('student')
      .select('*')
      .eq('email', email)
      .single();

  if (student) {
    return {
      userType: 'student',
      user: student
    };
  }

  // Check instructor table next
  const { data: instructor, error: instructorError } = await supabase
      .from('instructor')
      .select('*')
      .eq('email', email)
      .single();

  if (instructor) {
    return {
      userType: 'instructor',
      user: instructor
    };
  }

  return null;
};

export const getUserByEmailAndType = async (email: string, userType: UserType): Promise<Student | Instructor | null> => {
  if (userType === 'student') {
    // Check student table only
    const { data: student } = await supabase
        .from('student')
        .select('*')
        .eq('email', email)
        .single();

    return student as Student | null;
  } else {
    // Check instructor table only
    const { data: instructor } = await supabase
        .from('instructor')
        .select('*')
        .eq('email', email)
        .single();

    return instructor as Instructor | null;
  }
};

/**
 * Update student details
 */
export const updateStudent = async (studentId: string, studentData: Partial<Student>): Promise<Student> => {
  const { data, error } = await supabase
      .from('student')
      .update(studentData)
      .eq('id', studentId)
      .select()
      .single();

  if (error) throw error;

  return data;
};

/**
 * Update instructor details
 */
export const updateInstructor = async (instructorId: string, instructorData: Partial<Instructor>): Promise<Instructor> => {
  const { data, error } = await supabase
      .from('instructor')
      .update(instructorData)
      .eq('id', instructorId)
      .select()
      .single();

  if (error) throw error;

  return data;
};