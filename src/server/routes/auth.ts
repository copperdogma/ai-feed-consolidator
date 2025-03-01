import express from 'express';
import type { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { requireAuth, firebaseAuth } from '../auth/middleware';
import { getServiceContainer } from '../services/service-container';
import { LoginHistoryService } from '../services/login-history';
import { verifyAuth } from '../auth/verify';

// Create router
const router = express.Router();

// Apply the firebaseAuth middleware to all auth routes
router.use(firebaseAuth);

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
router.post('/verify', async (req: Request, res: Response) => {
  await verifyAuth(req, res);
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

// Protected route example
router.get('/protected', requireAuth, (req: Request, res: Response) => {
  res.json({
    message: 'This is a protected route',
    user: req.user
  });
});

export default router; 