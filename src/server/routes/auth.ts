import { Router } from 'express';
import { logger } from '../logger';
import type { User } from '../services/db';
import { requireAuth } from '../middleware/auth';
import { LoginHistoryService } from '../services/login-history';

const router = Router();

// Split verify into two parts - initial check and protected data
router.get('/verify', (req, res, next) => {
  // Log session state for debugging
  logger.debug('Session verification request:', {
    sessionId: req.sessionID,
    hasSession: !!req.session,
    hasPassport: !!req.session?.passport,
    isAuthenticated: req.isAuthenticated(),
    user: req.user
  });

  // Ensure session ID is set
  if (!req.sessionID && req.session) {
    req.sessionID = require('crypto').randomBytes(16).toString('hex');
    logger.debug('Generated missing session ID:', req.sessionID);
  }

  if (!req.isAuthenticated()) {
    // Log failed authentication attempt
    if (req.loginAttempt) {
      try {
        LoginHistoryService.recordLoginAttempt({
          userId: null,
          ipAddress: req.loginAttempt.ipAddress,
          userAgent: req.loginAttempt.userAgent,
          success: false,
          loginTime: new Date(),
          failureReason: 'Not authenticated',
          requestPath: '/api/auth/verify'
        }).catch(error => {
          logger.error({ err: error }, 'Failed to record failed authentication attempt');
        });
      } catch (error) {
        logger.error({ err: error }, 'Error recording failed authentication attempt');
      }
    }
    
    res.status(401).json({
      authenticated: false,
      user: null,
      sessionId: req.sessionID
    });
    return;
  }

  // If authenticated, pass to requireAuth to record the access
  // Set the original URL to include the /api/auth prefix
  req.originalUrl = '/api/auth/verify';
  next();
}, requireAuth, (req, res) => {
  // This only runs if requireAuth passes
  res.json({
    authenticated: true,
    user: req.user,
    sessionId: req.sessionID
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ error: 'Failed to logout' });
    } else {
      res.json({ success: true });
    }
  });
});

// Test-only route for initializing session
if (process.env.NODE_ENV === 'test') {
  router.post('/session', async (req, res) => {
    if (!req.session) {
      logger.error('Session middleware not initialized');
      res.status(500).json({ error: 'Session middleware not initialized' });
      return;
    }

    try {
      // Create a complete User object with all required fields
      const user: User = {
        id: req.body.passport.user,
        google_id: req.body.passport.google_id,
        email: req.body.passport.email,
        display_name: req.body.passport.display_name,
        avatar_url: req.body.passport.avatar_url,
        feedly_access_token: null,
        feedly_refresh_token: null,
        feedly_user_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Initialize session with passport data
      req.session.passport = {
        user: user.id
      };

      // Save session and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logger.error({ err }, 'Error saving session');
            reject(err);
            return;
          }
          logger.debug('Session saved successfully');
          resolve();
        });
      });

      // Log in the user
      await new Promise<void>((resolve, reject) => {
        req.logIn(user, (err) => {
          if (err) {
            logger.error({ err }, 'Error logging in user');
            reject(err);
            return;
          }
          logger.debug('User logged in successfully');
          resolve();
        });
      });

      // Save session again after login
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logger.error({ err }, 'Error saving session after login');
            reject(err);
            return;
          }
          logger.debug('Session saved after login');
          resolve();
        });
      });

      // Log session state for debugging
      logger.debug('Session initialization successful:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        hasPassport: !!req.session.passport,
        isAuthenticated: req.isAuthenticated(),
        user: req.user
      });

      // Return success response with session info
      res.json({ 
        success: true,
        authenticated: true,
        user: user,
        sessionId: req.sessionID
      });
    } catch (error) {
      logger.error({ error }, 'Failed to initialize session');
      res.status(500).json({ error: 'Failed to initialize session' });
    }
  });
}

export default router; 