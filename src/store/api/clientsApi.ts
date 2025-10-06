// src/store/api/clientsApi.ts

import { studiosApi } from './studiosApi';

export const clientsApi = studiosApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getStudioClients: builder.query<unknown[], string>({
      query: (studioId) => `/studios/${studioId}/clients`,
      providesTags: ['StudioClients']
    }),
    getClientDetails: builder.query<unknown, { clientId: string, studioId: string }>({
      query: ({ clientId, studioId }) => `/clients/${clientId}?studioId=${studioId}`,
      providesTags: (_result, _error, arg) => [{ type: 'ClientDetails', id: arg.clientId }]
    }),
    getStudioStudentData: builder.query<
    { studio_student_id: string; goals: string | null },
    { studentId: string, studioId: string }
  >({
    query: ({ studentId, studioId }) => `/students/${studentId}/studios/${studioId}/relationship`,
    providesTags: (_result, _error, arg) => [
      { type: 'StudioStudentData', id: `${arg.studentId}-${arg.studioId}` }
    ]
  }),
    approveClient: builder.mutation<void, { studioStudentId: string, action: 'approve' | 'reject' }>({
      query: ({ studioStudentId, action }) => ({
        url: action === 'approve' ? `/clients/approve` : `/clients/delete`,
        method: 'POST',
        body: { studioStudentId }
      }),
      invalidatesTags: ['StudioClients']
    }),
    updateClientNotes: builder.mutation<void, { studioStudentId: string, notes: string, clientId?: string }>({
      query: ({ studioStudentId, notes }) => ({
        url: `/clients/notes`,
        method: 'POST',
        body: { studioStudentId, notes }
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ClientDetails', id: arg.clientId }
      ]
    }),
    updateClientGoals: builder.mutation<void, {
      studioStudentId: string,
      goals: string,
      clientId?: string
    }>({
      query: ({ studioStudentId, goals }) => ({
        url: `/clients/goals`,
        method: 'POST',
        body: { studioStudentId, goals }
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ClientDetails', id: arg.clientId }
      ]
    }),
    // endpoint for instructors to add students
    addStudentByInstructor: builder.mutation<unknown, {
      firstName: string,
      lastName: string,
      email: string,
      studioId: string
    }>({
      query: (data) => ({
        url: '/instructors/add-student',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['StudioClients']
    }),
    uploadClientProfilePicture: builder.mutation<{ success: boolean; url: string }, { clientId: string; file: File, studioId: string }>({
      query: ({ clientId, file, studioId }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: `/clients/${clientId}/profile-picture?studioId=${studioId}`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ClientDetails', id: arg.clientId },
        'StudioClients'
      ]
    }),
    updateClientProfile: builder.mutation<unknown, {
      clientId: string;
      studioId: string;
      profileData: {
        birthday?: string | null;
        height?: string | null;
        weight?: string | null;
        pathologies?: string | null;
        occupation?: string | null;
      };
    }>({
      query: ({ clientId, studioId, profileData }) => ({
        url: `/clients/${clientId}/profile?studioId=${studioId}`,
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ClientDetails', id: arg.clientId },
        'StudioClients'
      ]
    })
  })
});

export const {
  useGetStudioClientsQuery,
  useGetClientDetailsQuery,
  useGetStudioStudentDataQuery,
  useApproveClientMutation,
  useUpdateClientNotesMutation,
  useAddStudentByInstructorMutation,
  useUpdateClientGoalsMutation,
  useUploadClientProfilePictureMutation,
  useUpdateClientProfileMutation
} = clientsApi;