// src/services/client.service.ts
import { supabase } from '@/lib/supabase';

export const getStudioClients = async (studioId: string) => {
  // Join studio_student with student to get all data
  const { data, error } = await supabase
    .from('studio_student')
    .select(`
      studio_student_id,
      is_approved,
      student:student_id(*)
    `)
    .eq('studio_id', studioId);

  if (error) throw error;

  // Format the data to match the expected structure
  return data?.map(item => ({
    studio_student_id: item.studio_student_id,
    is_approved: item.is_approved,
    ...item.student
  })) || [];
};

export const getStudioIdFromStudioStudent = async (studioStudentId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('studio_student')
    .select('studio_id')
    .eq('studio_student_id', studioStudentId)
    .single();

  if (error) return null;

  return data.studio_id;
};

export const getClientDetails = async (clientId: string, studioId: string) => {
  // First get the studio_student record to get instructor_notes
  const { data: studioStudent, error: studioStudentError } = await supabase
    .from('studio_student')
    .select('studio_student_id, instructor_notes, goals')
    .eq('student_id', clientId)
    .eq('studio_id', studioId)
    .single();

  if (studioStudentError) throw studioStudentError;

  // Then get the student details
  const { data: student, error: studentError } = await supabase
    .from('student')
    .select('*')
    .eq('id', clientId)
    .single();

  if (studentError) throw studentError;

  const {password:_, ...otherStudentData} = student

  // Combine the data
  return {
    ...otherStudentData,
    studio_student_id: studioStudent?.studio_student_id,
    instructor_notes: studioStudent?.instructor_notes || '',
    goals: studioStudent?.goals || ''
  };
};

export const updateClientInstructorNotes = async (
  studioStudentId: string,
  instructorNotes: string
): Promise<unknown> => {
  const { data, error } = await supabase
    .from('studio_student')
    .update({ instructor_notes: instructorNotes })
    .eq('studio_student_id', studioStudentId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const updateClientGoals = async (
  studioStudentId: string,
  goals: string
): Promise<unknown> => {
  const { data, error } = await supabase
    .from('studio_student')
    .update({ goals })
    .eq('studio_student_id', studioStudentId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const approveClient = async (
  studioStudentId: string,
) => {

  const { data, error } = await supabase
    .from('studio_student')
    .update({ is_approved: true })
    .eq('studio_student_id', studioStudentId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const deleteStudioStudent = async (studioStudentId: string): Promise<void> => {
  // Get the studio_student record first to confirm it exists
  const { data: studioStudent, error: fetchError } = await supabase
    .from('studio_student')
    .select('studio_id, student_id')
    .eq('studio_student_id', studioStudentId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw new Error(`Studio student with ID ${studioStudentId} not found`);
    }
    throw fetchError;
  }

  // Delete the studio_student record and let the database trigger handle cascading deletions
  const { error: deleteError } = await supabase
    .from('studio_student')
    .delete()
    .eq('studio_student_id', studioStudentId);

  if (deleteError) throw deleteError;

  // No need to manually delete related records as the database trigger will handle it
  return;
};