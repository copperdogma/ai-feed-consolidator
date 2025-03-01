import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { LoginHistoryService } from '../services/login-history';
import { getServiceContainer } from '../services/service-container';

/**
 * Verify the user's authentication
 * @param req Express request
 * @param res Express response
 */
export const verifyAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Log the verification request
    logger.debug(`Verifying authentication for request: ${req.method} ${req.path}`);
    logger.debug(`Auth headers present: ${!!req.headers.authorization}`);
    
    // If the user is authenticated, the firebaseAuth middleware will have attached the user to the request
    if (!req.user) {
      logger.warn('No user found in request during verification');
      res.status(401).json({
        authenticated: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    // Log successful authentication
    logger.info(`User authenticated: ${req.user.email} (ID: ${req.user.id})`);
    
    // Record successful login
    try {
      const container = getServiceContainer();
      const loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');
      
      const userAgent = req.get('user-agent') || 'unknown';
      const ipAddress = req.ip || '0.0.0.0';
      
      await loginHistoryService.recordLogin(
        req.user.id,
        ipAddress,
        userAgent,
        true // success
      );
      
      logger.debug('Login recorded successfully');
    } catch (error) {
      // Don't fail the request if recording login fails
      logger.error('Failed to record login - Details:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message, 
          stack: error.stack
        } : error,
        userId: req.user.id
      });
    }

    // Return the user data
    res.status(200).json({
      authenticated: true,
      user: req.user
    });
  } catch (error) {
    logger.error('Error in verifyAuth:', error);
    res.status(500).json({
      authenticated: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
}; 