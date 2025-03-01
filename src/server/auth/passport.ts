import passport from 'passport';
import { UserService } from '../services/user-service';
import type { User } from '../../types/user';
import { getServiceContainer } from '../services/service-container';

// Extend express Request type to include login method
declare global {
  namespace Express {
    interface Request {
      login(user: User, done: (err: any) => void): void;
    }
  }
}

export function configurePassport(): void {
  const userService = getServiceContainer().getService<UserService>('userService');

  // Configure passport serialization
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await userService.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
} 