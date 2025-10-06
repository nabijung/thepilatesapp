// src/store/api/homeworkApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

import { Homework } from '@/types/models';

// src/store/api/homeworkApi.ts - Add/update these endpoints
export const homeworkApi = createApi({
  reducerPath: 'homeworkApi',
  baseQuery: baseQuery,
  tagTypes: ['StudentLessons'],
  endpoints: (builder) => ({
    getStudentHomework: builder.query<Homework[], { studentId: string, studioId: string }>({
      query: ({ studentId, studioId }) =>
        `/students/${studentId}/homework?studioId=${studioId}`,
      providesTags: ['StudentLessons']
    }),
    assignHomework: builder.mutation<unknown, {
      studentId: string,
      lessonId: string,
      date?: string
    }>({
      query: (data) => ({
        url: `/students/${data.studentId}/homework`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['StudentLessons']
    }),
    updateHomework: builder.mutation<unknown, {
      studentLessonId: string,
      lessonId?: string,
      date?: string,
      isCompleted?: boolean
    }>({
      query: ({ studentLessonId, ...updates }) => ({
        url: `/students/homework/${studentLessonId}`,
        method: 'PATCH',
        body: updates
      }),
      invalidatesTags: ['StudentLessons']
    }),
    updateHomeworkStatus: builder.mutation<unknown, {
      studentLessonId: string,
      isCompleted: boolean
    }>({
      query: ({ studentLessonId, isCompleted }) => ({
        url: `/students/homework/${studentLessonId}/status`,
        method: 'PATCH',
        body: { isCompleted }
      }),
      invalidatesTags: ['StudentLessons']
    }),
    deleteHomework: builder.mutation<void, string>({
      query: (studentLessonId) => ({
        url: `/students/homework/${studentLessonId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['StudentLessons']
    }),
  })
});

export const {
  useGetStudentHomeworkQuery,
  useAssignHomeworkMutation,
  useUpdateHomeworkMutation,
  useUpdateHomeworkStatusMutation,
  useDeleteHomeworkMutation
} = homeworkApi;