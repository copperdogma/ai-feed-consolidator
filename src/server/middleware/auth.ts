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
      user?: User;
    }
  }
}

// Configure Passport's Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${config.serverUrl}/api/auth/google/callback`,
      passReqToCallback: true
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: Profile, done: Function) => {
      try {
        // Validate profile data
        if (!profile.id || !profile.emails?.[0]?.value) {
          logger.error({ profile }, 'Invalid profile data');
          return done(new Error('Invalid profile data'));
        }

        const result = await UserService.findOrCreateGoogleUser(profile);

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
  const typedUser = user as User;
  logger.debug({ userId: typedUser.id }, 'Serializing user');
  done(null, typedUser.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    logger.debug({ userId: id }, 'Attempting to deserialize user');
    const user = await UserService.findUserById(id);
    if (user) {
      logger.debug({ userId: id, user }, 'User deserialized successfully');
      done(null, user);
    } else {
      logger.warn({ userId: id }, 'User not found during deserialization');
      // Instead of failing silently, we'll throw an error to trigger session regeneration
      done(new Error('User not found'));
    }
  } catch (error) {
    logger.error({ err: error, userId: id }, 'Error deserializing user');
    done(error);
  }
});

// Middleware to check if user is authenticated
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // Log session state for debugging
    logger.debug('Session state:', {
      url: req.url,
      method: req.method,
      sessionId: req.sessionID,
      hasSession: !!req.session,
      hasPassport: !!req.session?.passport,
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });

    if (!req.isAuthenticated()) {
      logger.warn('Unauthorized access attempt');
      // Record failed access attempt
      if (req.loginAttempt) {
        try {
          await LoginHistoryService.recordLoginAttempt({
            userId: null,
            ipAddress: req.loginAttempt.ipAddress,
            userAgent: req.loginAttempt.userAgent,
            success: false,
            loginTime: new Date(),
            failureReason: 'Unauthorized access attempt',
            requestPath: req.path
          });
        } catch (error) {
          logger.error({ err: error }, 'Failed to record unauthorized access attempt');
        }
      }
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Record successful access
    if (req.loginAttempt && req.user) {
      try {
        await LoginHistoryService.recordLoginAttempt({
          userId: req.user.id,
          ipAddress: req.loginAttempt.ipAddress,
          userAgent: req.loginAttempt.userAgent,
          success: true,
          loginTime: new Date(),
          requestPath: req.originalUrl || req.url
        });
      } catch (error) {
        logger.error({ err: error }, 'Failed to record successful access');
        // Don't block access just because we couldn't record it
      }
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'Error in auth middleware');
    res.status(500).json({ error: 'Internal server error' });
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