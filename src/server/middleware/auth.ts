/**
 * @deprecated This file is deprecated as the application has migrated to Firebase Authentication.
 * It is kept for reference and backward compatibility with tests.
 * Use Firebase Authentication methods instead.
 */

// @ts-expect-error - Deprecated file, kept for backward compatibility
import passport from 'passport';
// @ts-expect-error - Deprecated file, kept for backward compatibility
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { config } from '../config';
import { LoginHistoryService } from '../services/login-history';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserService } from '../services/user-service';
import { GoogleAuthService } from '../services/google-auth-service';
import type { User } from '../../types/user';
import { logger } from '../logger';
import { getServiceContainer } from '../services/service-container';

// Get service instances
const container = getServiceContainer();
const userService = container.getService<UserService>('userService');
const googleAuthService = container.getService<GoogleAuthService>('googleAuthService');
const loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');

// Extend Express Request to include loginAttempt
// @ts-expect-error - Using namespace is standard pattern for Express
declare global {
  namespace Express {
    interface Request {
      loginAttempt?: {
        ipAddress: string;
        userAgent: string;
      };
      user?: User;
    }
  }
}

// Configure passport serialization
passport.serializeUser((user: User, done: (err: unknown, id?: number) => void) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done: (err: unknown, user?: User) => void) => {
  try {
    logger.debug({ userId: id }, 'Attempting to deserialize user');
    const user = await userService.findById(id);
    if (!user) {
      logger.warn({ userId: id }, 'User not found during deserialization');
      done(new Error('User not found'));
      return;
    }
    logger.debug({ userId: id }, 'User deserialized successfully');
    done(null, user);
  } catch (error) {
    logger.error({ err: error, userId: id }, 'Error deserializing user');
    done(error);
  }
});

// Configure Passport's Google Strategy
passport.use(
  new GoogleStrategy(
    {
      // @ts-expect-error - Deprecated file, kept for backward compatibility
      clientID: config.google.clientId,
      // @ts-expect-error - Deprecated file, kept for backward compatibility
      clientSecret: config.google.clientSecret,
      // @ts-expect-error - Deprecated file, kept for backward compatibility
      callbackURL: config.google.callbackUrl,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: unknown, user?: User) => void
    ) => {
      try {
        logger.debug({ profile }, 'Google authentication attempt');
        const user = await googleAuthService.findOrCreateGoogleUser(profile);
        
        // Record successful login
        await loginHistoryService.recordLogin(
          user.id,
          'pending',  // ipAddress - Will be set by middleware
          'pending'   // userAgent - Will be set by middleware
        );

        logger.info({ userId: user.id }, 'Google authentication successful');
        return done(null, user);
      } catch (error) {
        logger.error({ err: error }, 'Google authentication failed');
        return done(error);
      }
    }
  )
);

// Middleware to require authentication
// @ts-expect-error - Deprecated file, kept for backward compatibility
export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // @ts-expect-error - Deprecated file, kept for backward compatibility
  if (!req.isAuthenticated()) {
    // Record failed login attempt
    await loginHistoryService.recordLogin(
      0, // userId 0 for unauthenticated attempts
      req.ip || 'Unknown',
      req.get('User-Agent') || 'Unknown'
    );

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }
  next();
};

// Middleware to add request info to login attempts
// @ts-expect-error - Deprecated file, kept for backward compatibility
export const addRequestInfo: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userAgent = req.get('User-Agent') || 'Unknown';
  req.loginAttempt = {
    ipAddress: req.ip || 'Unknown',
    userAgent,
  };
  next();
};

export default passport; 