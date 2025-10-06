// src/store/api/notebookApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

interface NotebookEntry {
  entry_id: string;
  studio_id: string;
  title: string;
  contents: string;
  exercise_selected?: string;
  instructor_id: string;
  notebook_id: string;
  entry_date?: string;
  created_at: string;
  updated_at: string;
}

interface NotebookEntriesResponse {
  notebookId: string;
  entries: NotebookEntry[];
}

interface AddNotebookEntryRequest {
  studentId: string;
  instructorId: string;
  studioId: string;
  title: string;
  contents: string;
  exercise_selected?: string;
  entry_date?: string;
  invalidateCache?: boolean;
}

interface UpdateNotebookEntryRequest {
  entryId: string;
  title: string;
  contents: string;
  exercise_selected?: string;
  entry_date?: string;
}

interface DeleteNotebookEntryRequest {
  entryId: string;
}

export const notebookApi = createApi({
  reducerPath: 'notebookApi',
  baseQuery: baseQuery,
  tagTypes: ['NotebookEntries'],
  endpoints: (builder) => ({
    getNotebookEntries: builder.query<NotebookEntriesResponse, {
      studentId: string;
      studioId: string
    }>({
      query: ({ studentId, studioId }) =>
        `/students/${studentId}/studios/${studioId}/notebook`,
      providesTags: (result, error, arg) => 
        result 
          ? [
              'NotebookEntries',
              ...result.entries.map(({ entry_id }) => ({ type: 'NotebookEntries' as const, id: entry_id }))
            ]
          : ['NotebookEntries']
    }),
    getNotebookEntry: builder.query<NotebookEntry, {
      entryId: string
    }>({
      query: ({ entryId }) => `/notebook/entries/${entryId}`,
      providesTags: (result, error, arg) => [
        { type: 'NotebookEntries', id: arg.entryId }
      ]
    }),
    addNotebookEntry: builder.mutation<NotebookEntry, AddNotebookEntryRequest>({
      query: (data) => ({
        url: `/notebook/entries`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['NotebookEntries']
    }),
    createDraftEntry: builder.mutation<NotebookEntry, AddNotebookEntryRequest>({
      query: (data) => ({
        url: `/notebook/entries`,
        method: 'POST',
        body: data
      }),
      // Conditionally invalidate cache based on invalidateCache parameter
      invalidatesTags: (result, error, arg) => 
        arg.invalidateCache ? ['NotebookEntries'] : []
    }),
    updateNotebookEntry: builder.mutation<NotebookEntry, UpdateNotebookEntryRequest>({
      query: ({ entryId, ...data }) => ({
        url: `/notebook/entries/${entryId}`,
        method: 'PUT',
        body: data
      }),
      // Only invalidate the specific entry, not the entire list
      invalidatesTags: (result, error, arg) => [
        { type: 'NotebookEntries', id: arg.entryId }
      ]
    }),
    // Autosave mutation that doesn't invalidate any cache to prevent list refreshes
    autosaveNotebookEntry: builder.mutation<NotebookEntry, UpdateNotebookEntryRequest>({
      query: ({ entryId, ...data }) => ({
        url: `/notebook/entries/${entryId}`,
        method: 'PUT',
        body: data
      }),
      // Don't invalidate any cache for autosave to prevent UI flickering
      invalidatesTags: (result, error, arg) => [
        { type: 'NotebookEntries', id: arg.entryId }
      ]
    }),
    deleteNotebookEntry: builder.mutation<void, DeleteNotebookEntryRequest>({
      query: ({ entryId }) => ({
        url: `/notebook/entries/${entryId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['NotebookEntries']
    })
  })
});

export const {
  useGetNotebookEntriesQuery,
  useGetNotebookEntryQuery,
  useAddNotebookEntryMutation,
  useCreateDraftEntryMutation,
  useUpdateNotebookEntryMutation,
  useAutosaveNotebookEntryMutation,
  useDeleteNotebookEntryMutation
} = notebookApi;