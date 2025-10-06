import { validate } from 'uuid';

/**
 * Validates if a string is a valid full UUID
 */
export const isValidFullStudioId = (uuid: string): boolean => {
  return validate(uuid);
};

/**
 * NEW APPROACH: Instead of converting UUIDs, we now use the short_id column in the database
 * The following functions remain as stubs with appropriate warnings for backwards compatibility
 * but should be removed in future updates
 */

export const toShortUUID = (uuid: string): string => {
  console.warn('toShortUUID is deprecated. Use the studio.short_id property from the database instead.');
  return ''; // Return empty string as this function should not be used
};

export const toFullUUID = (shortId: string): string => {
  console.warn('toFullUUID is deprecated. Studio lookup should be done by short_id in the database.');
  return ''; // Return empty string as this function should not be used
};

export const isValidShortUUID = (shortId: string): boolean => {
  console.warn('isValidShortUUID is deprecated. Use database lookups instead.');
  return false; // Return false as this function should not be used
};

// These functions are also deprecated and should not be used
export const generateShortUUID = (): string => {
  console.warn('generateShortUUID is deprecated. Short IDs are now generated in the database.');
  return '';
};

export const generateUUID = (): { short: string, full: string } => {
  console.warn('generateUUID is deprecated. UUIDs and short IDs are now generated in the database.');
  return { short: '', full: '' };
};