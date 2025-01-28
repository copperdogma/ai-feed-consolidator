import { Router } from 'express';
import passport from 'passport';
import { User } from '../types/auth';
import { requireAuth } from '../middleware/auth';
import { LoginHistoryService } from '../services/login-history';
import { pool } from '../services/db';
import { GoogleProfile } from '../types/auth';
import { UserService } from '../services/user';

const router = Router();
const loginHistoryService = new LoginHistoryService();

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (req.user) {
        try {
          await loginHistoryService.recordLogin(
            req.user.id,
            '/api/auth/google/callback',
            req.ip,
            req.get('User-Agent') || 'Unknown'
          );
        } catch (error) {
          // Log the error but don't fail the request
          console.error('Error recording login history:', error);
        }
      }
      res.redirect('/');
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('/');
    }
  }
);

router.get('/check', async (req, res) => {
  if (!req.user) {
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    user: req.user
  });
});

router.get('/verify', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ authenticated: false });
    return;
  }

  // Record the login history
  try {
    await loginHistoryService.recordLogin(
      req.user.id,
      '/api/auth/verify',
      req.ip,
      req.get('User-Agent') || 'Unknown'
    );
  } catch (error) {
    // Log the error but don't fail the request
    console.error('Error recording login history:', error);
  } finally {
    // Always send the successful response
    res.status(200).json({
      authenticated: true,
      user: req.user,
      sessionId: req.sessionID
    });
  }
});

router.post('/session', async (req, res) => {
  if (!req.body?.passport?.user) {
    res.status(400).json({ error: 'Missing user ID' });
    return;
  }

  const userId = req.body.passport.user;

  try {
    // First verify the user exists
    const user = await UserService.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Initialize the session with the user
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Record the login history
    try {
      await loginHistoryService.recordLogin(
        user.id,
        '/api/auth/session',
        req.ip,
        req.get('User-Agent') || 'Unknown'
      );
    } catch (error) {
      // Log the error but don't fail the request
      console.error('Error recording login history:', error);
    }

    // Ensure session is saved before responding
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.status(200).json({
      authenticated: true,
      user: req.user,
      sessionId: req.sessionID
    });
  } catch (error) {
    console.error('Session initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize session' });
  }
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

const createUser = async (profile: GoogleProfile): Promise<User> => {
  const result = await pool.query(
    `INSERT INTO users (
      google_id,
      email,
      display_name,
      avatar_url
    ) VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      profile.id,
      profile.emails?.[0]?.value || '',
      profile.displayName || null,
      profile.photos?.[0]?.value || null
    ]
  );
  return result.rows[0];
};

export default router; 