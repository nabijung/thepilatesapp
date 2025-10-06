// src/services/photos.service.ts
import { supabase } from '@/lib/supabase';

import { deleteProgressPhoto } from './storage.service';

export interface ProgressPhoto {
  id: string;
  url: string;
  filename: string;
  date: string;
}

export const getProgressPhotos = async (
  studioStudentId: string
): Promise<ProgressPhoto[]> => {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id, url, filename, date')
    .eq('studio_student_id', studioStudentId)
    .order('date', { ascending: false });

  if (error) throw error;

  return data || [];
};

export const addProgressPhoto = async (
  studioStudentId: string,
  photoData: {
    url: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }
): Promise<ProgressPhoto> => {
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      studio_student_id: studioStudentId,
      url: photoData.url,
      filename: photoData.filename,
      content_type: photoData.contentType,
      size_bytes: photoData.sizeBytes
    })
    .select('id, url, filename, date')
    .single();

  if (error) throw error;

  return data;
};

export const removeProgressPhoto = async (
  photoId: string,
  studioStudentId: string
): Promise<void> => {
  // First get the photo to retrieve the filename
  const { data: photo, error: fetchError } = await supabase
    .from('progress_photos')
    .select('filename')
    .eq('id', photoId)
    .eq('studio_student_id', studioStudentId) // Add studio_student_id check for security
    .single();

  if (fetchError) throw fetchError;

  // Delete the file from storage
  await deleteProgressPhoto(photo.filename, studioStudentId);

  // Delete the database record
  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
};

// Helper function to check if instructor has access to studio_student
export const isInstructorForStudioStudent = async (
  instructorId: string,
  studioStudentId: string
): Promise<boolean> => {
  // First get the studio_id from studio_student
  const { data: studioStudent, error: studioStudentError } = await supabase
    .from('studio_student')
    .select('studio_id')
    .eq('studio_student_id', studioStudentId)
    .single();

  if (studioStudentError) return false;

  // Then check if instructor is associated with this studio
  const { data, error } = await supabase
    .from('studio_instructor')
    .select('is_approved')
    .eq('instructor_id', instructorId)
    .eq('studio_id', studioStudent.studio_id)
    .single();

  if (error) return false;

  return data.is_approved;
};