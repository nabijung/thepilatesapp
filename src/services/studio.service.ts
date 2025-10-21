// src/services/studio.service.ts
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Studio {
  studio_id: string;
  name: string;
  location: string;
  created_date: string;
  updated_at: string;
}

/**
 * Get a studio by ID
 */
export const getStudioById = async (studioId: string): Promise<Studio | null> => {
  const { data, error } = await supabase
    .from('studio')
    .select('*')
    .eq('studio_id', studioId)
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get a studio by short ID
 */
export const getStudioByShortId = async (shortId: string): Promise<Studio | null> => {
  const { data, error } = await supabase
    .from('studio')
    .select('*')
    .eq('short_id', shortId)
    .single();

  if (error) throw error;

  return data;
};

/**
 * Get studios for an instructor
 */
 export const getInstructorStudios = async (instructorId: string): Promise<(Studio & { is_approved: boolean; is_admin: boolean })[]> => {
  const { data, error } = await supabase
    .from('studio_instructor')
    .select('*, studio!inner(*)')
    .eq('instructor_id', instructorId);

  if (error) throw error;

  // Transform the data to match the desired output
  return (data as any[]).map(item => ({
    ...item.studio,
    is_approved: item.is_approved || false,
    is_admin: item.is_admin || false
  })) || [];
};

/**
 * Get studios for a student
 */
 export const getStudentStudios = async (studentId: string): Promise<(Studio & { is_approved: boolean })[]> => {
  const { data, error } = await supabase
    .from('studio_student')
    .select('studio_id, is_approved, studio!inner(*)')
    .eq('student_id', studentId);

  if (error) throw error;

  // Transform the data to match the desired output
  return (data as any[]).map(item => ({
    ...item.studio,
    is_approved: item.is_approved || false
  })) || [];
};

/**
 * Get the relationship data between a student and a studio
 * @param studentId The student ID
 * @param studioId The studio ID
 * @returns The studio-student relationship data or null
 */
 export const getStudioStudentRelationship = async (
  studentId: string,
  studioId: string
): Promise<{ studio_student_id: string; goals: string | null } | null> => {
  const { data, error } = await supabase
    .from('studio_student')
    .select('studio_student_id, goals')
    .eq('student_id', studentId)
    .eq('studio_id', studioId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw error;
  }

  return data;
};


/**
 * Create a new studio
 *
 */
 export const createStudio = async (
  instructorId: string,
  studioData: { name: string; location?: string }
): Promise<Studio> => {
  // Generate a studio ID
  const studioId = uuidv4();

  // Create the studio
  const { data, error } = await supabase
    .from('studio')
    .insert({
      studio_id: studioId,
      name: studioData.name,
      location: studioData.location || ''
    })
    .select()
    .single();

  if (error) throw error;

  // Connect instructor to studio as owner
  const { error: linkError } = await supabase
    .from('studio_instructor')
    .insert({
      studio_id: studioId,
      instructor_id: instructorId,
      is_approved: true // Instructor is automatically approved for their own studio
    });

  if (linkError) throw linkError;

  return data;
};

/**
 * Add instructor to studio
 */
export const addInstructorToStudio = async (
  studioId: string,
  instructorId: string,
  isApproved: boolean = false
): Promise<void> => {
  const { error } = await supabase
    .from('studio_instructor')
    .insert({
      studio_id: studioId,
      instructor_id: instructorId,
      is_approved: isApproved
    });

  if (error) throw error;
};

/**
 * Add student to studio
 */
export const addStudentToStudio = async (
  studioId: string,
  studentId: string,
  isApproved: boolean = false
): Promise<void> => {
  const { error } = await supabase
    .from('studio_student')
    .insert({
      studio_id: studioId,
      student_id: studentId,
      is_approved: isApproved
    });

  if (error) throw error;
};

// Get all available studios
export const getAllStudios = async (): Promise<Studio[]> => {
  const { data, error } = await supabase
    .from('studio')
    .select('*')
    .order('name');

  if (error) throw error;

  return data as Studio[];
};

// Change studio for a student
export const changeStudentStudio = async (studentId: string, newStudioId: string): Promise<void> => {
  console.log(`Attempting to find studio with ID: ${newStudioId}`);
  let fullStudioId: string;

  // Try to find the studio by short_id
  const { data: studioByShort, error: shortIdError } = await supabase
    .from('studio')
    .select('studio_id, short_id')
    .eq('short_id', newStudioId)
    .single();

  console.log('Short ID lookup result:', { studioByShort, shortIdError });

  if (studioByShort) {
    fullStudioId = studioByShort.studio_id;
    console.log(`Found studio by short_id: ${fullStudioId}`);
  } else {
    // If not found by short_id, try finding by full UUID
    const { data: studioByFull, error: fullIdError } = await supabase
      .from('studio')
      .select('studio_id, short_id')
      .eq('studio_id', newStudioId)
      .single();

    console.log('Full UUID lookup result:', { studioByFull, fullIdError });

    if (studioByFull) {
      fullStudioId = studioByFull.studio_id;
      console.log(`Found studio by full UUID: ${fullStudioId}`);
    } else {
      console.log('Studio not found by either short_id or full UUID');
      throw new Error('Studio not found. Please check the studio ID and try again.');
    }
  }

  // Check if the student is already in the studio
  const { data: existingEntry, error: checkError } = await supabase
    .from('studio_student')
    .select('*')
    .eq('student_id', studentId)
    .eq('studio_id', fullStudioId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  // If already exists and approved, do nothing
  if (existingEntry?.is_approved) return;

  // If exists but not approved, update
  if (existingEntry) {
    const { error: updateError } = await supabase
      .from('studio_student')
      .update({ is_approved: false })
      .eq('student_id', studentId)
      .eq('studio_id', fullStudioId);

    if (updateError) throw updateError;

    return;
  }

  // Insert new studio student relationship
  const { error } = await supabase
    .from('studio_student')
    .insert({
      student_id: studentId,
      studio_id: fullStudioId,
      is_approved: false
    });

  if (error) throw error;
};

// Change studio for an instructor
export const changeInstructorStudio = async (instructorId: string, newStudioId: string): Promise<void> => {
  console.log(`Attempting to find studio with ID: ${newStudioId}`);
  let fullStudioId: string;

  // Try to find the studio by short_id
  const { data: studioByShort, error: shortIdError } = await supabase
    .from('studio')
    .select('studio_id, short_id')
    .eq('short_id', newStudioId)
    .single();

  console.log('Short ID lookup result:', { studioByShort, shortIdError });

  if (studioByShort) {
    fullStudioId = studioByShort.studio_id;
    console.log(`Found studio by short_id: ${fullStudioId}`);
  } else {
    // If not found by short_id, try finding by full UUID
    const { data: studioByFull, error: fullIdError } = await supabase
      .from('studio')
      .select('studio_id, short_id')
      .eq('studio_id', newStudioId)
      .single();

    console.log('Full UUID lookup result:', { studioByFull, fullIdError });

    if (studioByFull) {
      fullStudioId = studioByFull.studio_id;
      console.log(`Found studio by full UUID: ${fullStudioId}`);
    } else {
      console.log('Studio not found by either short_id or full UUID');
      throw new Error('Studio not found. Please check the studio ID and try again.');
    }
  }

  // Check if the instructor is already in the studio
  const { data: existingEntry, error: checkError } = await supabase
    .from('studio_instructor')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('studio_id', fullStudioId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  // If already exists and approved, do nothing
  if (existingEntry?.is_approved) return;

  // If exists but not approved, update
  if (existingEntry) {
    const { error: updateError } = await supabase
      .from('studio_instructor')
      .update({ is_approved: false })
      .eq('instructor_id', instructorId)
      .eq('studio_id', fullStudioId);

    if (updateError) throw updateError;

    return;
  }

  // Insert new studio instructor relationship
  const { error } = await supabase
    .from('studio_instructor')
    .insert({
      instructor_id: instructorId,
      studio_id: fullStudioId,
      is_approved: false
    });

  if (error) throw error;
};

/**
 * Verify that an instructor has access to a client through a studio
 * @param clientId The client/student ID
 * @param studioId The studio ID
 * @param instructorId The current instructor's ID
 * @returns boolean indicating whether access is allowed
 */
 export const verifyClientStudioAccess = async (
  clientId: string,
  studioId: string,
  instructorId: string
): Promise<boolean> => {

  // First verify that the instructor has access to this studio
  const { data: instructorStudio, error: instructorError } = await supabase
    .from('studio_instructor')
    .select('*')
    .eq('instructor_id', instructorId)
    .eq('studio_id', studioId)
    .eq('is_approved', true)
    .single();

    console.log('instructorStudio');
    console.log(instructorStudio);
    console.log('instructorError');
    console.log(instructorError);

  if (instructorError || !instructorStudio) {
    return false;
  }

  // Then verify that the client belongs to this studio
  const { data: clientStudio, error: clientError } = await supabase
    .from('studio_student')
    .select('*')
    .eq('student_id', clientId)
    .eq('studio_id', studioId)
    .single();

    console.log('clientStudio');
    console.log(clientStudio);
    console.log('clientError')
    console.log(clientError)

  if (clientError || !clientStudio) {
    return false;
  }

  // Both conditions are true, so access is granted
  return true;
};

// Helper function to check if instructor has access to studio
export const isInstructorForStudio = async (
  instructorId: string,
  studioId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('studio_instructor')
    .select('is_approved')
    .eq('instructor_id', instructorId)
    .eq('studio_id', studioId)
    .single();

  if (error) return false;

  return data.is_approved;
};

/**
 * Find a studio by either short_id or full UUID
 * This function first tries to find a studio by its short_id.
 * If that fails, it tries to find it by its full UUID.
 */
export const findStudioByAnyId = async (studioId: string): Promise<string | null> => {
  // First try to find by short_id
  const { data: studioByShort, error: shortIdError } = await supabase
    .from('studio')
    .select('studio_id')
    .eq('short_id', studioId)
    .single();

  if (studioByShort) {
    return studioByShort.studio_id;
  }

  // If not found by short_id, try as full UUID
  // Check if this UUID exists in the database
  const { data: studioByFull, error: fullIdError } = await supabase
    .from('studio')
    .select('studio_id')
    .eq('studio_id', studioId)
    .single();

  if (studioByFull) {
    return studioByFull.studio_id;
  }

  // Not found by either method
  return null;
};
