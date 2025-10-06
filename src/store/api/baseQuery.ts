import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { logout } from '../slices/authSlice';

// Helper function to check if code is running in browser
const isBrowser = typeof window !== 'undefined';

// Custom base query that checks for X-Clear-Storage header
export const baseQuery: BaseQueryFn = async (args: FetchArgs, api, extraOptions) => {
  // Use the default fetchBaseQuery
  const result = await fetchBaseQuery({ baseUrl: '/api' })(args, api, extraOptions);

  
  return result;
};
