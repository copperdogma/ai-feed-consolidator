import { Router } from 'express';
import passport from 'passport';
import type { Request, Response, NextFunction } from 'express';
import type { User } from '../../types/user';
import { requireAuth } from '../middleware/auth';
import { UserService } from '../services/user-service';
import { logger } from '../logger';
import { getServiceContainer } from '../services/service-container';

const router = Router();

// Get service instance
const container = getServiceContainer();
const userService = container.getService<UserService>('userService');

// Test-only routes (only available in test environment)
if (process.env.NODE_ENV === 'test') {
  router.post('/session', async (req: Request, res: Response) => {
    try {
      if (!req.session) {
        res.status(500).json({ error: 'Session not initialized' });
        return;
      }

      // Validate request body
      if (!req.body.passport || !req.body.passport.user) {
        res.status(400).json({ 
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid session data'
          }
        });
        return;
      }

      // Get user from database to ensure it exists
      const user = await userService.findById(req.body.passport.user);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Initialize session with provided data
      req.session.passport = req.body.passport;
      
      // Use login to properly set up the session
      req.login(user, (err) => {
        if (err) {
          logger.error({ err }, 'Error logging in user');
          res.status(500).json({ error: 'Failed to log in user' });
          return;
        }
        res.json({ message: 'Session initialized' });
      });
    } catch (error) {
      logger.error({ err: error }, 'Error initializing session');
      res.status(500).json({ error: 'Failed to initialize session' });
    }
  });

  router.get('/check', (req: Request, res: Response) => {
    res.json({ 
      authenticated: req.isAuthenticated(),
      user: req.user
    });
  });

  router.get('/verify', requireAuth, (req: Request, res: Response) => {
    res.json({ 
      authenticated: true,
      user: req.user
    });
  });
}

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    res.redirect('/');
  }
);

// Get current user
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await userService.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    logger.error({ err: error }, 'Error getting current user');
    next(error);
  }
});

// Logout
router.post('/logout', (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err) => {
    if (err) {
      logger.error({ err }, 'Error during logout');
      next(err);
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router; 