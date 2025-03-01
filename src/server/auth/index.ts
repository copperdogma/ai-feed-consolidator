/**
 * @deprecated These exports are deprecated as the application has migrated to Firebase Authentication.
 * They are kept for reference and backward compatibility with tests.
 * Use Firebase Authentication methods instead.
 */

export { configureGoogleStrategy } from './google-strategy';
export { configureSession } from './session';
export { configurePassport } from './passport';
export { requireAuth, addRequestInfo } from './middleware';

// Extend Express.User with our User type
declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string | null;
      email: string;
      display_name: string;
      avatar_url: string | null;
      created_at: Date;
      updated_at: Date;
    }
  }
} 