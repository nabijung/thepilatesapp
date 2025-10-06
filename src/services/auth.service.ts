// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';

import { supabase } from '@/lib/supabase';
import { UserType } from '@/types/index';
import { Instructor, Student } from '@/types/models';

import { getUserByEmailAndType,getUserByEmail } from './user.service';

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  studioId?: string;
  // Additional fields for studio creation (instructors only)
  studioName?: string;
  studioLocation?: string;
  // Additional student fields
  age?: number;
  height?: number;
  weight?: number;
  pathologies?: string;
  occupation?: string;
}

/**
 * Generate a JWT token for the user
 */
const generateToken = (email: string, userType:UserType): string => {
  const jwtSecret = process.env.JWT_SECRET || '';

  return sign({ email, userType }, jwtSecret, { expiresIn: '7d' });
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): { email: string } | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET || '';
    const decoded = verify(token, jwtSecret) as { email: string };

    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Register a new user
 */
export const signUpUser = async (
  userType: UserType,
  userData: SignUpData
): Promise<unknown> => {
  // Normalize email to lowercase before checking or storing
  const normalizedEmail = userData.email.toLowerCase();

  let fullStudioId = null;

  // If studioId is provided, try to find it in the database
  if (userData.studioId) {
    // First try to find the studio by short_id
    const { data: studioByShort, error: shortIdError } = await supabase
      .from('studio')
      .select('studio_id')
      .eq('short_id', userData.studioId)
      .single();

    if (studioByShort) {
      fullStudioId = studioByShort.studio_id;
    } else {
      // If not found by short_id, try as a full UUID
      const { data: studioByFull, error: fullIdError } = await supabase
        .from('studio')
        .select('studio_id')
        .eq('studio_id', userData.studioId)
        .single();

      if (studioByFull) {
        fullStudioId = studioByFull.studio_id;
      } else {
        throw new Error('Studio not found. Please check the studio ID and try again.');
      }
    }
  }

  // Check if email exists in the appropriate table based on userType
  const existingUser = await getUserByEmailAndType(normalizedEmail, userType);
  if (existingUser) {
    throw new Error(`This email already exists as a ${userType}`);
  }

  // For instructors, validate that either studioId or studioName is provided
  if (userType === 'instructor' && !userData.studioId && !userData.studioName) {
    throw new Error('Instructors must provide either a Studio ID or Studio details');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Insert into the appropriate table with normalized email
  if (userType === 'student') {
    const { data, error } = await supabase
      .from('student')
      .insert({
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: normalizedEmail, // Store lowercase email
        password: hashedPassword,
        age: userData.age || null,
        height: userData.height || null,
        weight: userData.weight || null,
        pathologies: userData.pathologies || null,
        occupation: userData.occupation || null
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } else {
    // For instructors, use a transaction to ensure all operations succeed or fail together
    const { data, error } = await supabase.rpc('create_instructor_with_studio', {
      p_first_name: userData.firstName,
      p_last_name: userData.lastName,
      p_email: normalizedEmail, // Store lowercase email
      p_password: hashedPassword,
      p_studio_id: fullStudioId,
      p_studio_name: userData.studioName || null,
      p_studio_location: userData.studioLocation || null
    });

    if (error) throw error;

    return data;
  }
};

/**
 * Sign in a user with email and password
 */
export const signInUser = async (email: string, password: string, userType: UserType): Promise<{ token: string; user: unknown; userType: UserType }> => {
  // Normalize email to lowercase before checking
  const normalizedEmail = email.toLowerCase();

  // Find user in the specific table based on userType
  const user = await getUserByEmailAndType(normalizedEmail, userType);
  if (!user) {
    throw new Error(`No ${userType} found with this email`);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, (user as any).password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  // Generate a JWT token using normalized email
  const token = generateToken(normalizedEmail, userType);

  return {
    token,
    user,
    userType
  };
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<void> => {
  // In a custom auth system, signout is handled by clearing cookies
  // No server-side action needed besides clearing the token cookie
  // This is handled in the API route
};

/**
 * Get the current logged in user by token
 */
export const getUserFromToken = async (token: string): Promise<{ userType: UserType, user: Student | Instructor } | null> => {
  const decoded = verifyToken(token);
  if (!decoded || !decoded.email) {
    return null;
  }

  return await getUserByEmail(decoded.email);
};