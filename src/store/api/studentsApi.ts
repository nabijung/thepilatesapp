// src/store/api/studentsApi.ts

import { Lesson } from '@/services/lesson.service';
import { Entry } from '@/services/notebook.service';
import { Student } from '@/services/student.service';

import { STUDIO_TAGS } from '../tags';

import { studiosApi } from './studiosApi';

export interface UpdateStudentProfileRequest {
  studentId: string;
  profileData: {
    email?: string;
    birthday?: string | null;
    height?: number | null;
    weight?: number | null;
    pathologies?: string | null;
    occupation?: string | null;
    goals?: string | null;
    studioStudentId?: string;
    profile_picture_url?: string | null;
  };
}

const studentsApi = studiosApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getStudentLessons: builder.query<(Lesson & { is_completed: boolean })[], string>({
      query: (studentId) => `/students/${studentId}/lessons`,
      providesTags: ['StudentLessons']
    }),
    completeLesson: builder.mutation<void, { studentId: string; lessonId: string; isCompleted: boolean }>({
      query: ({ studentId, lessonId, isCompleted }) => ({
        url: `/students/${studentId}/lessons/${lessonId}/complete`,
        method: 'POST',
        body: { isCompleted }
      }),
      invalidatesTags: ['StudentLessons']
    }),
    getNotebookEntries: builder.query<Entry[], { studentId: string; studioId: string }>({
      query: ({ studentId, studioId }) =>
        `/students/${studentId}/studios/${studioId}/notebook`,
      providesTags: ['NotebookEntries']
    }),
    getStudentStudios: builder.query<unknown[], string>({
      query: (studentId) => `/students/${studentId}/studios`,
      providesTags: (result, error, studentId) => [
        // STUDIO_TAGS.STUDENT_STUDIOS,
        { type: STUDIO_TAGS.STUDENT_STUDIOS, id: studentId }
      ]
    }),
    getStudioStudentRelationship: builder.query<{ studio_student_id: string; goals: string | null }, { studentId: string; studioId: string }>({
      query: ({ studentId, studioId }) => `/students/${studentId}/studios/${studioId}/relationship`,
      providesTags: ['StudioStudentRelationship']
    }),
    //
    getStudentProfile: builder.query<Student, string>({
      query: (studentId) => `/students/${studentId}/profile`,
      providesTags: ['StudentProfile']
    }),
    updateStudentProfile: builder.mutation<Student, UpdateStudentProfileRequest>({
      query: ({ studentId, profileData }) => ({
        url: `/students/${studentId}/profile`,
        method: 'PUT',
        body: profileData
      }),
      invalidatesTags: ['StudentProfile', 'StudioStudentData']
    }),
    uploadProfilePicture: builder.mutation<{ success: boolean; url: string }, { studentId: string; file: File }>({
      query: ({ studentId, file }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: `/students/${studentId}/profile-picture`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['StudentProfile', 'StudioClients']
    })
  })
});

export const {
  useGetStudentLessonsQuery,
  useCompleteLessonMutation,
  useGetNotebookEntriesQuery,
  useGetStudentStudiosQuery,
  useGetStudioStudentRelationshipQuery,
  //
  useGetStudentProfileQuery,
  useUpdateStudentProfileMutation,
  useUploadProfilePictureMutation
} = studentsApi;