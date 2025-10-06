// src/store/api/authApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

import { UserType } from '@/types/index';

interface LoginRequest {
  email: string;
  password: string;
  userType: UserType;
}

interface SignupRequest {
  email: string;
  password: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  studioId?: string;
  studioName?: string;
  studioLocation?: string;
  // Additional student fields
  age?: number;
  height?: number;
  weight?: number;
  pathologies?: string;
  occupation?: string;
}

interface CheckUserRequest {
  email: string;
  userType?: UserType;
}

interface SetPasswordRequest {
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  studioId?: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQuery,
  endpoints: (builder) => ({
    login: builder.mutation<unknown, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    signup: builder.mutation<unknown, SignupRequest>({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    //
    checkUserExists: builder.mutation<{ exists: boolean; userType?: UserType }, CheckUserRequest>({
      query: (data) => ({
        url: '/auth/check-user',
        method: 'POST',
        body: data,
      }),
    }),
    setPassword: builder.mutation<unknown, SetPasswordRequest>({
      query: (data) => ({
        url: '/auth/set-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useCheckUserExistsMutation,
  useSetPasswordMutation
} = authApi;