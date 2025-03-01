import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';
import { LoginHistoryService } from '../services/login-history';
import { getServiceContainer } from '../services/service-container';
import { verifyIdToken, findOrCreateFirebaseUser } from './firebase-admin';
import { User } from '../../types/user';
import { db } from '../db/db'; // Import direct db reference as fallback

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
    // Log the request path for debugging
    logger.debug(`Processing authentication for: ${req.method} ${req.path}`);
    
    // Get the ID token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug(`No valid Authorization header found for: ${req.method} ${req.path}`);
      req.user = undefined;
      next();
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      logger.debug('Authorization header found but no token extracted');
      req.user = undefined;
      next();
      return;
    }

    logger.debug('Token found, verifying with Firebase Admin...');
    
    // Verify the ID token
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken) {
      logger.warn('Token verification failed');
      req.user = undefined;
      next();
      return;
    }

    logger.debug(`Token verified for user: ${decodedToken.email || decodedToken.uid}`);
    
    // Get the database from the service container or use direct db reference
    let dbInstance;
    try {
      const container = getServiceContainer();
      dbInstance = container.getService('db');
    } catch (error) {
      logger.warn('Could not get db service from container, using direct db reference');
      dbInstance = db;
    }

    if (!dbInstance) {
      logger.error('No database instance available');
      req.user = undefined;
      next();
      return;
    }

    // Find or create the user in our database
    logger.debug('Finding or creating user in database...');
    const user = await findOrCreateFirebaseUser(decodedToken, dbInstance);
    if (!user) {
      logger.error('Failed to find or create user in database');
      req.user = undefined;
      next();
      return;
    }

    logger.debug(`User found/created with ID: ${user.id}, email: ${user.email}`);
    
    // Attach the user to the request
    req.user = user;
    
    // Add isAuthenticated method to request
    req.isAuthenticated = function() {
      return !!req.user;
    };

    logger.debug('Authentication successful, continuing to next middleware');
    next();
  } catch (error) {
    logger.error('Error in firebaseAuth middleware:', error);
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    }
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