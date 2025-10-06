'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Studio {
  studio_id: number | string;
  short_id: string;
  name: string;
  location?: string;
  is_approved?: boolean;
  is_admin?: boolean;
}

interface StudioState {
  activeStudio: Studio | null;
  studios: Studio[];
  isLoading: boolean;
  error: string | null;
}

// Helper function to check if code is running in browser
const isBrowser = typeof window !== 'undefined';

// Helper function to load active studio from localStorage
const loadActiveStudioFromStorage = (): Studio | null => {
  if (!isBrowser) return null;

  try {
    const storedStudio = localStorage.getItem('activeStudio');
    return storedStudio ? JSON.parse(storedStudio) : null;
  } catch (error) {
    console.error('Error loading active studio from localStorage:', error);
    return null;
  }
};

const initialState: StudioState = {
  activeStudio: isBrowser ? loadActiveStudioFromStorage() : null,
  studios: [],
  isLoading: false,
  error: null,
};

const studioSlice = createSlice({
  name: 'studio',
  initialState,
  reducers: {
    setActiveStudio(state, action: PayloadAction<Studio>) {
      state.activeStudio = action.payload;

      // Persist to localStorage
      if (isBrowser) {
        try {
          localStorage.setItem('activeStudio', JSON.stringify(action.payload));
        } catch (error) {
          console.error('Error saving active studio to localStorage:', error);
        }
      }
    },
    setStudios(state, action: PayloadAction<Studio[]>) {
      state.studios = action.payload;

      // If there's a stored active studio, try to find its updated version in the fetched studios
      if (state.activeStudio) {
        const updatedActiveStudio = action.payload.find(
          studio => String(studio.studio_id) === String(state.activeStudio?.studio_id)
        );

        // If found, update the active studio with fresh data (including approval status)
        if (updatedActiveStudio) {
          state.activeStudio = updatedActiveStudio;

          // Update localStorage
          if (isBrowser) {
            try {
              localStorage.setItem('activeStudio', JSON.stringify(updatedActiveStudio));
            } catch (error) {
              console.error('Error updating active studio in localStorage:', error);
            }
          }
        }
      }
      // If no active studio is set and there are approved studios,
      // automatically set the first approved studio as active
      else if (action.payload.length > 0) {
        const approvedStudio = action.payload.find(studio => studio.is_approved);

        if (approvedStudio) {
          state.activeStudio = approvedStudio;

          // Persist to localStorage
          if (isBrowser) {
            try {
              localStorage.setItem('activeStudio', JSON.stringify(approvedStudio));
            } catch (error) {
              console.error('Error saving active studio to localStorage:', error);
            }
          }
        }
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearStudios(state) {
      state.studios = [];
      state.activeStudio = null;

      // Remove from localStorage
      if (isBrowser) {
        try {
          localStorage.removeItem('activeStudio');
        } catch (error) {
          console.error('Error removing active studio from localStorage:', error);
        }
      }
    },
    refreshActiveStudio(state) {
      // Find the current activeStudio in the studios array to get fresh data
      if (state.activeStudio && state.studios.length > 0) {
        const refreshedStudio = state.studios.find(
          studio => String(studio.studio_id) === String(state.activeStudio?.studio_id)
        );

        if (refreshedStudio) {
          state.activeStudio = refreshedStudio;

          // Update localStorage
          if (isBrowser) {
            try {
              localStorage.setItem('activeStudio', JSON.stringify(refreshedStudio));
            } catch (error) {
              console.error('Error refreshing active studio in localStorage:', error);
            }
          }
        }
      }
    }
  },
});

export const {
  setActiveStudio,
  setStudios,
  setLoading,
  setError,
  clearStudios,
  refreshActiveStudio
} = studioSlice.actions;

export default studioSlice.reducer;