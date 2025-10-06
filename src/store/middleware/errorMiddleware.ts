// src/store/middleware/errorMiddleware.ts
import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';

import { addToast } from '../slices/toastSlice';
import { logout } from '../slices/authSlice';

// Helper function to check if code is running in browser
const isBrowser = typeof window !== 'undefined';

// Helper function to convert database errors to user-friendly messages
const getUserFriendlyErrorMessage = (error: unknown): string => {
    // Default generic error message
    const message = 'An error occurred. Please try again.';

    // Handle string errors
    if (typeof error === 'string') {
      // Check for common database error patterns
      if (error.includes('foreign key constraint')) {
        if (error.includes('studio_instructor_studio_id_fkey')) {
          return 'Invalid studio ID. The studio does not exist.';
        }
        if (error.includes('studio_student_studio_id_fkey')) {
          return 'Invalid studio ID. The studio does not exist.';
        }

        return 'The operation failed because of a relationship constraint.';
      }

      if (error.includes('unique constraint')) {
        if (error.includes('email')) {
          return 'This email address is already in use.';
        }

        return 'A duplicate record already exists.';
      }

      // If no pattern match, just return the error string if it's not too technical
      if (!error.includes('PGRST') && !error.includes('syntax') && error.length < 100) {
        return error;
      }
    }

    // Handle error objects with message property
    if (typeof error === 'object' && error !== null) {
      if ('message' in error && typeof error.message === 'string') {
        // Now TypeScript knows error.message is a string
        if (!error.message.includes('constraint') &&
            !error.message.includes('PGRST') &&
            !error.message.includes('syntax')) {
          return error.message;
        }
      }
    }

    // Handle specific Supabase error codes
    if ((error as any)?.code) {
      switch ((error as any).code) {
        case '23505': return 'A record with this information already exists.';
        case '23503': return 'This operation failed because the referenced record does not exist.';
        case '22P02': return 'Invalid data format was provided.';
        case '42P01': return 'The requested resource does not exist.';
        case '42501': return 'You do not have permission to perform this action.';
        case 'PGRST116': return 'The requested record was not found.';
        case '23502': return 'Required information is missing.';
      }
    }

    // Handle specific HTTP status codes
    if ((error as any)?.status) {
      switch ((error as any).status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Your session has expired. Please log in again.';
        case 403: return 'You do not have permission to perform this action.';
        case 404: return 'The requested resource was not found.';
        case 409: return 'This operation could not be completed due to a conflict.';
        case 429: return 'Too many requests. Please try again later.';
        case 500: return 'A server error occurred. Please try again later.';
      }
    }

    // Return the default message if nothing specific was matched
    return message;
  };

/**
 * Log a warning and show a toast when we get a rejected RTK Query response
 */
export const rtkQueryErrorLogger: Middleware = (api) => (next) => (action) => {
  // RTK Query uses `createAsyncThunk` from redux-toolkit under the hood, so we can check for rejected actions
  if (isRejectedWithValue(action)) {
    const { payload } = action;
    console.error('API Error:', payload); // Log the full error for debugging

    // Extract the error details
    let error: any = null;

    if ((payload as any)?.data?.message) {
      error = (payload as any).data.message;
    } else if ((payload as any)?.error) {
      if (payload && typeof payload === 'object' && 'error' in payload) {
        error = (payload as { error: unknown }).error;
      } else {
        error = payload;
      }
    } else if (typeof payload === 'string') {
      error = payload;
    } else if ((payload as any)?.data?.error) {
      error = (payload as any).data.error;
    } else if ((payload as any)?.status && (payload as any)?.data) {
      error = { status: (payload as any).status, ...(payload as any).data };
    } else {
      error = payload;
    }

    // Check if this is an authentication error (401)
    const isAuthError = (error as any)?.status === 401 || 
                       (error as any)?.data?.status === 401 ||
                       (typeof error === 'string' && error.toLowerCase().includes('unauthorized'));

    if (isAuthError) {
      // Dispatch full logout action (like manual logout)
      logout()(api.dispatch);
      
      // Show authentication error toast
      api.dispatch(addToast({
        message: 'Your session has expired. Please log in again.',
        type: 'error',
      }));

      // Redirect to login page if in browser
      if (isBrowser) {
        // Use a small delay to ensure the toast is shown before redirect
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } else {
      // Convert to user-friendly message for non-auth errors
      const userFriendlyMessage = getUserFriendlyErrorMessage(error);

      // Dispatch the error toast
      api.dispatch(addToast({
        message: userFriendlyMessage,
        type: 'error',
      }));
    }
  }

  return next(action);
};