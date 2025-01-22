import 'express-session';
import { User } from './auth';

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }
} 