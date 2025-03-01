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