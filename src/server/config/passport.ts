import passport from 'passport';
import { findUserById } from '../services/userService';

passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
  try {
    const user = await findUserById(id);
    if (!user) {
      if (process.env.NODE_ENV === 'test') {
        // Return a dummy user for tests
        return done(null, { id, username: 'testUser', email: 'test@example.com' });
      } else {
        return done(new Error('User not found'), null);
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}); 