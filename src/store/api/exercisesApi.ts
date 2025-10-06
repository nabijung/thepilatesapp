// src/store/api/exercisesApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

import { Exercise, ExerciseList } from '@/services/exercise.service';

export const exercisesApi = createApi({
  reducerPath: 'exercisesApi',
  baseQuery: baseQuery,
  tagTypes: ['Exercises', 'ExerciseLists'],
  endpoints: (builder) => ({
    getAllExerciseLists: builder.query<ExerciseList[], void>({
      query: () => '/exercise-lists',
      providesTags: ['ExerciseLists']
    }),
    getExercisesByListId: builder.query<Exercise[], string>({
      query: (listId) => `/exercise-lists/${listId}/exercises`,
      providesTags: (result, error, listId) => [
        { type: 'Exercises', id: listId }
      ]
    }),
    getAllExercisesWithLists: builder.query<{ lists: ExerciseList[], exercises: Exercise[] }, void>({
      query: () => '/exercises',
      providesTags: ['Exercises', 'ExerciseLists']
    }),
  })
});

export const {
  useGetAllExerciseListsQuery,
  useGetExercisesByListIdQuery,
  useGetAllExercisesWithListsQuery
} = exercisesApi;