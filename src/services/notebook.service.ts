// src/services/notebook.service.ts
import { supabase } from '@/lib/supabase';

export interface Notebook {
  notebook_id: string;
  student_id: string;
  studio_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotebookEntry {
  notebook_id: string;
  entry_id: string;
  instructor_id: string;
  entry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  entry_id: string;
  studio_id: string;
  title: string;
  contents: string;
  entry_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get a student's notebook
 */
export const getStudentNotebook = async (studentId: string, studioId: string): Promise<Notebook | null> => {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('student_id', studentId)
    .eq('studio_id', studioId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows returned"

  return data;
};

export const getNotebookEntries = async (studentId: string, studioId: string) => {
  // Get the notebook ID
  const { data: notebook, error: notebookError } = await supabase
    .from('notebooks')
    .select('notebook_id')
    .eq('student_id', studentId)
    .eq('studio_id', studioId)
    .single();

  if (notebookError) {
    // If notebook doesn't exist, create one
    if (notebookError.code === 'PGRST116') {
      const { data: newNotebook, error: createError } = await supabase
        .from('notebooks')
        .insert({
          student_id: studentId,
          studio_id: studioId
        })
        .select()
        .single();

      if (createError) throw createError;

      return { notebookId: newNotebook.notebook_id, entries: [] };
    }
    throw notebookError;
  }

  // Get entries for this notebook
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('*')
    .eq('notebook_id', notebook.notebook_id)
    .order('created_at', { ascending: false });

  if (entriesError) throw entriesError;

  return {
    notebookId: notebook.notebook_id,
    entries: entries || []
  };
};

// Get or create notebook for a student in a specific studio
export const getOrCreateNotebook = async (studentId: string, studioId: string) => {
  // First, check if the student already has a notebook for this studio
  const { data: existingNotebook, error: fetchError } = await supabase
    .from('notebooks')
    .select('notebook_id')
    .eq('student_id', studentId)
    .eq('studio_id', studioId)
    .single();

  // If there's an error but it's not "no rows returned", throw it
  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

  // If notebook exists, return its ID
  if (existingNotebook) {
    return existingNotebook.notebook_id;
  }

  // Otherwise, create a new notebook
  const { data: newNotebook, error: createError } = await supabase
    .from('notebooks')
    .insert({
      student_id: studentId,
      studio_id: studioId
    })
    .select('notebook_id')
    .single();

  if (createError) throw createError;

  return newNotebook.notebook_id;
};

// Add a new notebook entry
export const addNotebookEntry = async (
  studentId: string,
  instructorId: string,
  studioId: string,
  title: string,
  contents: string,
  exercise_selected?: string,
  entry_date?: string,
) => {
  try {
    // Get or create notebook for this student
    const notebookId = await getOrCreateNotebook(studentId, studioId);

    // Add the entry
    const { data, error } = await supabase
      .from('entries')
      .insert({
        notebook_id: notebookId,
        instructor_id: instructorId,
        studio_id: studioId,
        title,
        contents,
        exercise_selected,
        entry_date,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding notebook entry:', error);
    throw error;
  }
};

/**
 * Get a notebook entry by ID
 */
 export const getNotebookEntry = async (entryId: string): Promise<unknown> => {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('entry_id', entryId)
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update a notebook entry
 */
export const updateNotebookEntry = async (entryId: string, updateData: {
  title?: string;
  contents?: string;
  exercise_selected?: string;
  entry_date?: string;
}) => {
  const { data, error } = await supabase
    .from('entries')
    .update(updateData)
    .eq('entry_id', entryId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete a notebook entry
 */
 export const deleteNotebookEntry = async (entryId: string): Promise<void> => {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('entry_id', entryId);

  if (error) throw error;
};