// src/store/api/photosApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

export interface ProgressPhoto {
    id: string;
    url: string;
    date: string;
}

export const photosApi = createApi({
    reducerPath: 'photosApi',
    baseQuery: baseQuery,
    tagTypes: ['Photos'],
    endpoints: (builder) => ({
        getProgressPhotos: builder.query<ProgressPhoto[], string>({
            query: (studioStudentId) => `/studio-students/${studioStudentId}/photos`,
            providesTags: ['Photos']
        }),
        uploadProgressPhoto: builder.mutation<ProgressPhoto, { studioStudentId: string; file: File }>({
            query: ({ studioStudentId, file, studioId }: { studioStudentId: string; file: File; studioId?: string }) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('studioId', studioId);

                return {
                    url: `/studio-students/${studioStudentId}/photos`,
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: ['Photos']
        }),
        deleteProgressPhoto: builder.mutation<void, { photoId: string; studioStudentId: string; studioId?: string; }>({
            query: ({ photoId, studioStudentId, studioId }: { photoId: string; studioStudentId: string; studioId?: string }) => ({
                url: `/studio-students/${studioStudentId}/photos/${photoId}?studioId=${studioId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Photos']
        })
    }),
});

export const {
    useGetProgressPhotosQuery,
    useUploadProgressPhotoMutation,
    useDeleteProgressPhotoMutation
} = photosApi;