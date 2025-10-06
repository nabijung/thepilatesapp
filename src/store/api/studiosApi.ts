// src/store/api/studiosApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

import { UserType } from '@/types/index';

import { STUDIO_TAGS } from '../tags';

export const studiosApi = createApi({
  reducerPath: 'studiosApi',
  baseQuery: baseQuery,
  tagTypes: ['Studios',
  STUDIO_TAGS.INSTRUCTOR_STUDIOS,
    STUDIO_TAGS.STUDENT_STUDIOS,
    'StudentLessons',
     'NotebookEntries',
    'StudentProfile',
    'InstructorProfile',
     STUDIO_TAGS.INSTRUCTOR_STUDIOS,
     'StudioClients',
      'Instructors',
       'ClientDetails',
       'StudioStudentData',
       'StudioStudentRelationship'
  ],
  endpoints: (builder) => ({
    // Fetch all studios
    getAllStudios: builder.query<unknown[], void>({
      query: () => '/studios',
      providesTags: ['Studios']
    }),

    // Change studio
    changeStudio: builder.mutation<void, {
      userId: string;
      userType: UserType;
      studioId: string
    }>({
      query: (data) => ({
        url: '/users/change-studio',
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, arg) => [
        // STUDIO_TAGS.INSTRUCTOR_STUDIOS,
        // STUDIO_TAGS.STUDENT_STUDIOS
        arg.userType === 'student'
          ? { type: STUDIO_TAGS.STUDENT_STUDIOS, id: arg.userId }
          : { type: STUDIO_TAGS.INSTRUCTOR_STUDIOS, id: arg.userId }
      ]
    })
  })
});

export const {
  useGetAllStudiosQuery,
//   useGetUserStudiosQuery,
  useChangeStudioMutation
} = studiosApi;