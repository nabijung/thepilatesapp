// src/services/storage.service.ts
import { supabaseAdmin } from '@/lib/supabase';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

export const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 100MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFile = (file: File): FileValidationResult => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an image file (JPEG, PNG, GIF, WEBP, HEIC, HEIF).'
    };
  }

  // Check file size
  // if (file.size > MAX_FILE_SIZE) {
  //   return {
  //     valid: false,
  //     error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
  //   };
  // }

  return { valid: true };
};

export const uploadProgressPhoto = async (
  file: File,
  studioStudentId: string
): Promise<{ url: string; filename: string; contentType: string; sizeBytes: number }> => {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `progress_photos/${studioStudentId}/${filename}`;

  // Use the admin client that bypasses RLS
  // This is safe because we already verified authorization in the API route
  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    filename,
    contentType: file.type,
    sizeBytes: file.size
  };
};

export const deleteProgressPhoto = async (
  filename: string,
  studioStudentId: string
): Promise<void> => {
  // Use the admin client that bypasses RLS
  // This is safe because we already verified authorization in the API route
  const filePath = `progress_photos/${studioStudentId}/${filename}`;

  const { error } = await supabaseAdmin.storage
    .from('images')
    .remove([filePath]);

  if (error) {
    console.error('Storage delete error:', error);
    throw error;
  }
};

export const uploadProfilePicture = async (
  file: File,
  userId: string
): Promise<{ url: string; filename: string; contentType: string; sizeBytes: number }> => {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `profile_pictures/${userId}/${filename}`;

  // First try to find and delete existing profile pictures to save storage
  try {
    const { data: existingFiles } = await supabaseAdmin.storage
      .from('images')
      .list(`profile_pictures/${userId}`);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(file => `profile_pictures/${userId}/${file.name}`);
      await supabaseAdmin.storage
        .from('images')
        .remove(filesToDelete);

      console.log(`Deleted ${filesToDelete.length} old profile pictures for user ${userId}`);
    }
  } catch (error) {
    console.error('Error deleting old profile pictures:', error);
    // Continue with upload even if deletion fails
  }

  // Use the admin client that bypasses RLS
  // This is safe because we already verified authorization in the API route
  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    filename,
    contentType: file.type,
    sizeBytes: file.size
  };
};