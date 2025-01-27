import 'express-session';
import { User } from './auth';

declare module 'express-session' {
  interface SessionData {
    user?: User;
    feedlyState?: string;
  }
}

declare global {
  namespace Express {
    interface User extends Omit<User, 'id'> {
      id: number;
    }
  }
} 