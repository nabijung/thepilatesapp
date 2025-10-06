// src/services/lesson.service.ts
import { supabase } from '@/lib/supabase';
import { SupabaseError } from '@/types/index';

export interface Lesson {
  lesson_id: string;
  instructions: string;
  level: string;
  reps: string;
  studio_id: string;
  title: string;
  video_url: string;
  created_at: string;
  updated_at: string;
}

export interface StudentLesson {
  student_lesson_id: string; // Updated to match schema
  student_id: string;
  lesson_id: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get lessons for a studio
 */
export const getStudioLessons = async (studioId: string): Promise<Lesson[]> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
};

export const updateHomework = async (
  studentLessonId: string,
  updates: {
    is_completed?: boolean;
    assigned_date?: string;
    lesson_id?: string;
  }
): Promise<void> => {
  const { error } = await supabase
    .from('student_lessons')
    .update(updates)
    .eq('student_lesson_id', studentLessonId);

  if (error) throw error;
};

/**
 * Delete studio lesson / Homework
 */
 export const deleteHomework = async (homeworkId: string): Promise<void> => {
  const { error } = await supabase
    .from('student_lessons')
    .delete()
    .eq('student_lesson_id', homeworkId);

  if (error) throw error;
};

/**
 * Create a new lesson
 */
export const addLesson = async (lesson: Omit<Lesson, 'lesson_id' | 'created_at' | 'updated_at'>, studioId: string): Promise<Lesson> => {
  const { data, error } = await supabase
      .from('lessons')
      .insert({
        ...lesson,
        studio_id: studioId
      })
      .select()
      .single();

    if (error) throw error;

  return data;
};

/**
 * Get a specific lesson by ID
 */
 export const getLesson = async (lessonId: string): Promise<{ data: Lesson | null; error: SupabaseError | null }> => {
  // Validate lessonId to prevent database errors
  if (!lessonId || lessonId === 'null' || lessonId === 'undefined') {
    throw new Error('Invalid lesson ID provided');
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('lesson_id', lessonId)
    .single();

  if (error) throw error;

  return data;
};

/**
 * Update an existing lesson
 */
 export const updateLesson = async (lessonId: string, lessonData: {
  lessonId?: string; //
  title?: string;
  level?: string;
  reps?: string;
  video_url?: string;
  instructions?: string;
}) => {
  // Validate lessonId to prevent database errors
  if (!lessonId || lessonId === 'null' || lessonId === 'undefined') {
    throw new Error('Invalid lesson ID provided');
  }

  // Destructure to separate lessonId from the rest of the data
  const { lessonId: _, ...dataToUpdate } = lessonData;

  const { data, error } = await supabase
    .from('lessons')
    .update(dataToUpdate)
    .eq('lesson_id', lessonId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

/**
 * Delete a lesson
 */
export const deleteLesson = async (lessonId: string): Promise<void> => {
  // Validate lessonId to prevent database errors
  if (!lessonId || lessonId === 'null' || lessonId === 'undefined') {
    throw new Error('Invalid lesson ID provided');
  }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('lesson_id', lessonId);

  if (error) throw error;
};

/**
 * Get a student's assigned lessons (homework)
 */
 export const getStudentLessons = async (studentId: string, studioId: string): Promise<(Lesson & { student_lesson_id: string; is_completed: boolean })[]> => {
  // Include studio_id filter in the join query
  const { data, error } = await supabase
    .from('student_lessons')
    .select(`
      student_lesson_id,
      is_completed,
      created_at,
      lesson:lesson_id!inner(*)
    `)
    .eq('student_id', studentId)
    .eq('lesson.studio_id', studioId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Map the results
  return (data as any[]).map(item => ({
    ...item.lesson,
    student_lesson_id: item.student_lesson_id,
    is_completed: item.is_completed,
    assigned_date: item.created_at
  })) as (Lesson & { student_lesson_id: string; is_completed: boolean; })[];
}

/**
 * Assign a lesson to a student (create homework)
 */
 export const assignLessonToStudent = async (lessonId: string, studentId: string, date?: string | Date): Promise<StudentLesson> => {
  // Check if this assignment already exists
  const { data: existing, error: checkError } = await supabase
    .from('student_lessons')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .single();

  // If there's an error other than "no rows returned", throw it
  if (checkError && checkError.code !== 'PGRST116') throw checkError;

  // If assignment already exists, return it
  // if (existing) return existing;

  // Handle the date parameter correctly
  let formattedDate: string;

  if (!date) {
    // If no date provided, use current date
    formattedDate = new Date().toISOString();
  } else if (typeof date === 'string') {
    // If date is already a string, use it directly
    formattedDate = date;
  } else {
    // If date is a Date object, convert to ISO string
    formattedDate = date.toISOString();
  }

  // Create the assignment
  const { data, error } = await supabase
    .from('student_lessons')
    .insert({
      lesson_id: lessonId,
      student_id: studentId,
      is_completed: false,
      created_at: formattedDate
    })
    .select()
    .single();

  if (error) throw error;

  return data;
};
/**
 * Update homework completion status
 */
export const updateHomeworkStatus = async (studentLessonId: string, isCompleted: boolean): Promise<StudentLesson> => {
  const { data, error } = await supabase
    .from('student_lessons')
    .update({ is_completed: isCompleted })
    .eq('student_lesson_id', studentLessonId)
    .select()
    .single();

  if (error) throw error;

  return data;
};
