// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { authApi } from './api/authApi';
import { homeworkApi } from './api/homeworkApi';
import { lessonsApi } from './api/lessonsApi';
import { notebookApi } from './api/notebookApi';
import { photosApi } from './api/photosApi';
import { studiosApi } from './api/studiosApi';
import { exercisesApi } from './api/exercisesApi';
import { rtkQueryErrorLogger } from './middleware/errorMiddleware';
import { studioRefreshMiddleware } from './middleware/studioRefresh';
import authReducer from './slices/authSlice';
import studioReducer from './slices/studioSlice';
import toastReducer from './slices/toastSlice';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [studiosApi.reducerPath]: studiosApi.reducer,
    [homeworkApi.reducerPath]: homeworkApi.reducer,
    [lessonsApi.reducerPath]: lessonsApi.reducer,
    [notebookApi.reducerPath]: notebookApi.reducer,
    [exercisesApi.reducerPath]: exercisesApi.reducer,
    [photosApi.reducerPath]: photosApi.reducer,
    auth: authReducer,
    studio: studioReducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
    .concat(
      authApi.middleware,
      lessonsApi.middleware,
      photosApi.middleware,
      studiosApi.middleware,
      homeworkApi.middleware,
      notebookApi.middleware,
      exercisesApi.middleware,
      rtkQueryErrorLogger,
      studioRefreshMiddleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;