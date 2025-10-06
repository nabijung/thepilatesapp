// src/middleware/studioRefresh.ts
import { Middleware } from '@reduxjs/toolkit';

import { refreshActiveStudio } from '@/store/slices/studioSlice';

/**
 * Middleware to ensure the active studio is refreshed after studios are fetched
 */
export const studioRefreshMiddleware: Middleware = (store) => (next) => (action) => {
  // Process the action first
  const result = next(action);

  // Check if it's a successful completion of fetching studios
  if ((action as any).type.endsWith('/fulfilled') &&
  (
    (action as any).type.includes('getInstructorStudios') ||
    (action as any).type.includes('getStudentStudios')
  )
) {
    console.log('refreshing studios ',(action as any).type)
    // Refresh the active studio with the latest data
    store.dispatch(refreshActiveStudio());
  }

  return result;
};