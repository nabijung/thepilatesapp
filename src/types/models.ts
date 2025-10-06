// src/types/models.ts

export interface BaseUser {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface Student extends BaseUser {
  age?: number | null;
  height?: string | number | null; // Updated to accept both string and number
  weight?: string | number | null; // Updated to accept both string and number
  pathologies?: string | null;
  occupation?: string | null;
  birthday?: string | null;
  profile_picture_url?: string | null;
}

export interface Instructor extends BaseUser{
  _type: 'instructor';
}

export interface Studio {
  studio_id: string;
  name: string;
  location?: string;
  created_date: string;
  updated_at: string;
  is_approved?: boolean;
  short_id?: string;
}

export interface Lesson {
  lesson_id: string;
  instructions?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  reps?: string;
  studio_id: string;
  title: string;
  video_url?: string;
  created_at: string;
  updated_at: string;
  is_completed?: boolean;
}

export interface Homework extends Lesson {
  student_lesson_id: number;
};

export interface Notebook {
  notebook_id: string;
  student_id: string;
  studio_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotebookEntry {
  notebook_id: string;
  entry_id: string;
  instructor_id: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  entry_id: string;
  studio_id: string;
  title: string;
  contents: string;
  created_at: string;
  updated_at: string;
}