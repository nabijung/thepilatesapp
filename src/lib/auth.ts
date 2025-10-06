// src/lib/auth.ts

export interface TokenPayload {
  email: string;
  user_type: 'student' | 'instructor' | 'admin';
  id: string;
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        // Split the token into its parts
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode the payload (middle part) - Edge Runtime compatible
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );

        // Check if the token is expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          return null;
        }

        return {
          email: payload.email,
          user_type: payload.user_type,
          id: payload.sub || '' // JWT often includes 'sub' for subject
        };
      } catch (error) {
        return null;
      }
}

