import 'express-session';
import { User } from './auth';

declare module 'express-session' {
  interface SessionData {
    passport?: any;
    user?: User;
  }
}

declare global {
  namespace Express {
    interface User extends Omit<User, 'id'> {
      id: number;
    }
  }
} 