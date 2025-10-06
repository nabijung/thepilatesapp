// src/store/api/lessonsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

export const lessonsApi = createApi({
  reducerPath: 'lessonsApi',
  baseQuery: baseQuery,
  tagTypes: ['Lessons'],
  endpoints: (builder) => ({
    getStudioLessons: builder.query<unknown[], string>({
      query: (studioId) => `/studios/${studioId}/lessons`,
      providesTags: ['Lessons']
    }),
    getLesson: builder.query<unknown, string>({
      query: (lessonId) => `/lessons/${lessonId}`,
      providesTags: (result, error, id) => [{ type: 'Lessons', id }]
    }),
    addLesson: builder.mutation<unknown, {
      studioId: string,
      title: string,
      level: string,
      reps: string,
      video_url: string,
      instructions: string
    }>({
      query: (lessonData) => ({
        url: `/studios/${lessonData.studioId}/lessons`,
        method: 'POST',
        body: lessonData
      }),
      invalidatesTags: ['Lessons']
    }),
    updateLesson: builder.mutation<unknown, {
      lessonId: string,
      title: string,
      level: string,
      reps: string,
      video_url: string,
      instructions: string
    }>({
      query: (lessonData) => ({
        url: `/lessons/${lessonData.lessonId}`,
        method: 'PUT',
        body: lessonData
      }),
      invalidatesTags: (result, error, arg) => [
        'Lessons',
        { type: 'Lessons', id: arg.lessonId }
      ]
    }),
    deleteLesson: builder.mutation<void, string>({
      query: (lessonId) => ({
        url: `/lessons/${lessonId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Lessons']
    })
  })
});

export const {
  useGetStudioLessonsQuery,
  useGetLessonQuery,
  useAddLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation
} = lessonsApi;