import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config';
import { UserService } from '../services/user';
import { User } from '../services/db';

// Extend Express.User type
declare global {
  namespace Express {
    interface User {
      id: number;
      google_id: string;
      email: string;
      display_name: string | null;
    }
  }
}

// Configure Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { user } = await UserService.findOrCreateGoogleUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await UserService.getUserProfile(id);
    if (!result) {
      return done(new Error('User not found'));
    }
    done(null, result.user);
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Export configured passport for use in app
export { passport }; 