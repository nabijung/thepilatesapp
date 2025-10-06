import { BaseUser } from "./models";

export type UserType = 'student' | 'instructor';

export interface AuthUser extends BaseUser{
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  pathologies?: string | null;
  occupation?: string | null;
  birthday?: string | null;
  }

  /**
   * For backend errors
   */
  export interface SupabaseError {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
    status?: number;
  }

  export type ServiceError =  SupabaseError | Error

  /**
   * For Frontend API call errors
   */
   export type ErrorResponse = {
    status: number;
    data: {
      success: boolean;
      message: string;
    };
  };

export interface ClientDetails {
    studio_student_id: string;
    id?: string;
    instructor_notes?: string;
    goals?: string;
    first_name: string;
    last_name: string;
    email: string;
    birthday?: string;
    height?: string | number;
    weight?: string | number;
    pathologies?: string;
    occupation?: string;
    profile_picture_url?: string;
}

export interface ApiQueryResult<T> {
  data: T;
  isLoading: boolean;
  error: unknown;
}