import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';
import { LoginHistoryService } from '../services/login-history';
import { getServiceContainer } from '../services/service-container';
import { verifyIdToken, findOrCreateFirebaseUser } from './firebase-admin';
import { User } from '../../types/user';

// Extend Express Request type
declare module 'express' {
  interface Request {
    requestInfo?: {
      ip: string;
      userAgent: string;
      path: string;
      method: string;
    };
    user?: User;
    isAuthenticated(): boolean;
  }
}

/**
 * Firebase authentication middleware
 * Verifies the Firebase ID token in the Authorization header
 * and attaches the user to the request object
 */
export const firebaseAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get the ID token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      req.user = undefined;
      next();
      return;
    }

    // Verify the ID token
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken) {
      req.user = undefined;
      next();
      return;
    }

    // Get the database from the service container
    const container = getServiceContainer();
    const db = container.getService('db');

    // Find or create the user in our database
    const user = await findOrCreateFirebaseUser(decodedToken, db);
    if (!user) {
      req.user = undefined;
      next();
      return;
    }

    // Attach the user to the request
    req.user = user;
    
    // Add isAuthenticated method to request
    req.isAuthenticated = function() {
      return !!req.user;
    };

    next();
  } catch (error) {
    logger.error('Error in firebaseAuth middleware:', error);
    req.user = undefined;
    next();
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const container = getServiceContainer();
    const loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      // Only record failed login attempts for paths that look like login attempts
      if (req.path.toLowerCase().includes('login') || req.path.toLowerCase().includes('auth')) {
        const userAgent = (req.get('user-agent') || 'unknown') as string;
        const ipAddress = (req.ip || '0.0.0.0') as string;
        loginHistoryService.recordFailedAttempt(
          ipAddress,
          userAgent,
          'Unauthenticated request to protected route',
          req.path,
          req.user?.id
        ).catch(error => {
          logger.error('Failed to record login attempt:', error);
        });
      }

      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }
    next();
  } catch (error) {
    logger.error({ error }, 'Error in requireAuth middleware');
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export function addRequestInfo(req: Request, res: Response, next: NextFunction): void {
  // Add request info to the request object
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip || '0.0.0.0';
  req.requestInfo = {
    ip: ipAddress,
    userAgent: typeof userAgent === 'string' ? userAgent : 'unknown',
    path: req.path,
    method: req.method
  };
  next();
} 