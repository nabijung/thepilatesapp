import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AuthUser, UserType } from '@/types/index';

import { clearStudios } from './studioSlice'; // Import the clearStudios action

// Helper function to check if code is running in browser
const isBrowser = typeof window !== 'undefined';

interface AuthState {
  user: AuthUser | null;
  userType: UserType | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  userType: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; userType: UserType }>) {
      state.user = action.payload.user;
      state.userType = action.payload.userType;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearCredentials(state) {
      state.user = null;
      state.userType = null;
    },
  },
});

// Custom thunk to handle logout and clear studio
export const logout = () => (dispatch: any) => {
  // Clear user credentials
  dispatch(authSlice.actions.clearCredentials());

  // Clear studios
  dispatch(clearStudios());

  // Additional logout logic (e.g., clearing localStorage, calling logout API)
  if (isBrowser) {
    try {
      localStorage.removeItem('activeStudio');
    } catch (error) {
      console.error('Error removing active studio from localStorage:', error);
    }
  }
};

export const {
  setCredentials,
  setLoading,
  setError,
  clearCredentials
} = authSlice.actions;

export default authSlice.reducer;