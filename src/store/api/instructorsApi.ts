// src/store/api/instructorsApi.ts

import { Student } from '@/services/student.service';

import { STUDIO_TAGS } from '../tags';

import { Instructor } from '@/types/models';
import { studiosApi } from './studiosApi';

export interface UpdateInstructorProfileRequest {
  instructorId: string;
  profileData: {
    email?: string;
  };
}

const instructorsApi = studiosApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getStudioClients: builder.query<Student[], string>({
      query: (studioId) => `/studios/${studioId}/clients`,
      providesTags: ['StudioClients']
    }),
    getInstructorStudios: builder.query<unknown[], string>({
      query: (instructorId) => `/instructors/${instructorId}/studios`,
      providesTags: (result, error, instructorId) => [
        // STUDIO_TAGS.INSTRUCTOR_STUDIOS,
        { type: STUDIO_TAGS.INSTRUCTOR_STUDIOS, id: instructorId }
      ]
    }),

      // Instructor profile endpoints
      getInstructorProfile: builder.query<Instructor, string>({
        query: (instructorId) => `/instructors/${instructorId}/profile`,
        providesTags: ['InstructorProfile']
      }),
      updateInstructorProfile: builder.mutation<Instructor, UpdateInstructorProfileRequest>({
        query: ({ instructorId, profileData }) => ({
          url: `/instructors/${instructorId}/profile`,
          method: 'PUT',
          body: profileData
        }),
        invalidatesTags: ['InstructorProfile']
      }),
      approveInstructor: builder.mutation<void, { studioInstructorId: string, action: 'approve' | 'reject' }>({
        query: ({ studioInstructorId, action }) => ({
          url: action === 'approve' ? `/instructors/approve` : `/instructors/delete`,
          method: 'POST',
          body: { studioInstructorId }
        }),
        invalidatesTags: ['Instructors']
      }),
      getStudioInstructors: builder.query<unknown[], string>({
        query: (studioId) => `/studios/${studioId}/instructors`,
        providesTags: ['Instructors']
      }),
  })
});

export const {
  useGetStudioClientsQuery,
  // useGetStudioLessonsQuery,
  // useCreateLessonMutation,
  useGetInstructorStudiosQuery,
  //
  useGetInstructorProfileQuery,
  useUpdateInstructorProfileMutation,
  //
  useGetStudioInstructorsQuery,
  useApproveInstructorMutation,
} = instructorsApi;