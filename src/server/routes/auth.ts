import express from 'express';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { requireAuth } from '../auth/middleware';
import { getServiceContainer } from '../services/service-container';
import { LoginHistoryService } from '../services/login-history';

// Create router
const router = express.Router();

// Get current user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  try {
    // User is already attached to the request by the firebaseAuth middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    logger.error('Error in /api/auth/me route:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Verify Firebase ID token
router.post('/verify-token', (req: Request, res: Response) => {
  try {
    // The user is already attached to the request by the firebaseAuth middleware
    // If the token is valid, the user will be available
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    // Record successful login
    const container = getServiceContainer();
    const loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');
    
    const userAgent = req.get('user-agent') || 'unknown';
    const ipAddress = req.ip || '0.0.0.0';
    
    // Use a Promise to handle the async operation
    loginHistoryService.recordLogin(
      req.user.id,
      ipAddress,
      userAgent,
      true // success
    ).catch(error => {
      logger.error('Failed to record login:', error);
    });

    // Return the user
    res.json({
      user: req.user
    });
  } catch (error) {
    logger.error('Error in /api/auth/verify-token route:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Logout
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  try {
    // Firebase authentication is stateless, so we don't need to do anything server-side
    // The client will handle clearing the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Error in /api/auth/logout route:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

export default router; 