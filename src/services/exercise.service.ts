// src/services/exercise.service.ts
import { supabase } from "@/lib/supabase";

export interface ExerciseList {
  exercise_list_id: string;
  name: string;
}

export interface Exercise {
  exercise_id: string;
  exercise_name: string;
  exercise_list_id: string;
}

/**
 * Get all exercise lists
 */
export const getAllExerciseLists = async (): Promise<ExerciseList[]> => {
  const { data, error } = await supabase
    .from("exercise_lists")
    .select("*")
    .order("exercise_list_id", { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get exercises by list ID
 */
export const getExercisesByListId = async (
  listId: string,
): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("exercise_list_id", listId)
    .order("exercise_id", { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Get all exercises with their list information
 */
export const getAllExercisesWithLists = async (): Promise<{
  lists: ExerciseList[];
  exercises: Exercise[];
}> => {
  // First get all lists
  const { data: lists, error: listsError } = await supabase
    .from("exercise_lists")
    .select("*")
    .order("exercise_list_id", { ascending: true });

  if (listsError) throw listsError;

  // Then get all exercises
  const { data: exercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("*")
    .order("exercise_id", { ascending: true });

  if (exercisesError) throw exercisesError;

  return {
    lists: lists || [],
    exercises: exercises || [],
  };
};
