// src/services/instructor.service.ts
import { supabase } from '@/lib/supabase';

export interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get an instructor by ID
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
 * Update instructor details
 */
 export const updateInstructor = async (
  instructorId: string,
  instructorData: Partial<Omit<Instructor, 'id' | 'first_name' | 'last_name' | 'email' | 'password' | 'created_at' | 'updated_at'>>
): Promise<Instructor> => {
  const { data, error } = await supabase
    .from('instructor')
    .update(instructorData)
    .eq('id', instructorId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get instructors for a studio
 */
 export const getStudioInstructors = async (studioId: string) => {
  // Use explicit inner join to only get rows where the instructor exists
  const { data, error } = await supabase
    .from('studio_instructor')
    .select(`
      studio_instructor_id,
      is_admin,
      is_approved,
      instructor!inner(*)
    `)
    .eq('studio_id', studioId);

  if (error) throw error;

  // Format the data
  return data?.map(item => ({
    studio_instructor_id: item.studio_instructor_id,
    is_admin: item.is_admin,
    is_approved: item.is_approved,
    ...item.instructor
  })) || [];
};

export const approveInstructor = async (
  studioInstructorId: string,
) => {

  const { data, error } = await supabase
    .from('studio_instructor')
    .update({ is_approved: true })
    .eq('studio_instructor_id', studioInstructorId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const deleteStudioInstructor = async (studioInstructorId: string) => {
  const { error } = await supabase
    .from('studio_instructor')
    .delete()
    .eq('studio_instructor_id', studioInstructorId);

  if (error) throw error;

  return;
};