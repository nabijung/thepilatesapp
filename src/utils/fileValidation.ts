// src/utils/fileValidation.ts
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