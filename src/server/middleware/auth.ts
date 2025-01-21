import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { config } from '../config';
import { LoginHistoryService } from '../services/login-history';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserService } from '../services/user';
import { User } from '../services/db';
import { logger } from '../logger';

// Extend Express Request to include loginAttempt
declare global {
  namespace Express {
    interface Request {
      loginAttempt?: {
        ipAddress: string;
        userAgent: string;
      }
    }
    // Extend User interface
    interface User {
      id: number;
      google_id: string;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
    }
  }
}

// Configure Passport's Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: `${config.serverUrl}/auth/google/callback`,
      passReqToCallback: true
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: Profile, done: Function) => {
      try {
        // Validate profile data
        if (!profile.id || !profile.emails?.[0]?.value) {
          logger.error({ profile }, 'Invalid profile data');
          return done(new Error('Invalid profile data'));
        }

        const result = await UserService.findOrCreateUser({
          googleId: profile.id,
          email: profile.emails[0].value,
          displayName: profile.displayName || '',
          avatarUrl: profile.photos?.[0]?.value || null,
        });

        // Only record successful login attempts for valid users
        if (result?.user && req.loginAttempt) {
          try {
            await LoginHistoryService.recordLoginAttempt({
              userId: result.user.id,
              ipAddress: req.loginAttempt.ipAddress,
              userAgent: req.loginAttempt.userAgent,
              success: true,
              loginTime: new Date()
            });
            logger.info({ userId: result.user.id }, 'Successful login recorded');
          } catch (error) {
            logger.error({ err: error }, 'Failed to record successful login');
            // Don't fail the login just because we couldn't record it
          }
        }

        return done(null, result.user);
      } catch (error) {
        // For failed attempts, just log the error without trying to record to database
        logger.error({ err: error, profile: { id: profile.id, email: profile.emails?.[0]?.value } }, 'Login failed');
        return done(error);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: Express.User, done) => {
  logger.debug({ userId: user.id }, 'Serializing user');
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await UserService.findUserById(id);
    if (user) {
      logger.debug({ userId: id }, 'User deserialized');
    } else {
      logger.warn({ userId: id }, 'User not found during deserialization');
    }
    done(null, user);
  } catch (error) {
    logger.error({ err: error, userId: id }, 'Error deserializing user');
    done(error);
  }
});

// Middleware to check if user is authenticated
export const requireAuth: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    // Log session state for debugging
    logger.debug('Session state:', {
      hasSession: !!req.session,
      hasPassport: !!req.session?.passport,
      hasUser: !!req.user,
      sessionId: req.sessionID,
      user: req.user
    });

    // Ensure session is loaded and valid
    if (!req.session) {
      logger.error('Session middleware not initialized');
      res.status(500).json({ message: 'Session middleware not initialized' });
      return;
    }

    // If user is already loaded and authenticated, proceed
    if (req.user) {
      logger.debug({ userId: (req.user as User).id }, 'User already authenticated');
      next();
      return;
    }

    // Check for passport session and try to load user
    const userId = req.session.passport?.user;
    if (!userId) {
      logger.debug({ sessionId: req.sessionID }, 'No passport session found');
      res.status(401).json({ message: 'No passport session found' });
      return;
    }

    try {
      const user = await UserService.findUserById(userId);
      if (!user) {
        logger.warn({ userId }, 'User not found');
        res.status(401).json({ message: 'User not found' });
        return;
      }

      // Set the user on the request
      req.user = user;
      logger.debug({ userId: user.id }, 'User loaded from session');
      next();
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to load user');
      res.status(500).json({ message: 'Failed to load user' });
    }
  } catch (error) {
    logger.error({ err: error }, 'Auth middleware error');
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to add request info to login history
export const addRequestInfo: RequestHandler = (req, res, next) => {
  req.loginAttempt = {
    ipAddress: req.ip || req.socket.remoteAddress || '',
    userAgent: req.get('user-agent') || '',
  };
  logger.debug({ 
    ip: req.loginAttempt.ipAddress, 
    userAgent: req.loginAttempt.userAgent 
  }, 'Added request info');
  next();
};

export default passport; 