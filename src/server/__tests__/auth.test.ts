import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { passport } from '../middleware/auth';
import { config } from '../config';
import { db } from '../services/db';

describe('Authentication Flow', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    
    // Configure middleware
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    
    // Add auth routes
    app.get('/auth/google',
      passport.authenticate('google', {
        scope: ['profile', 'email']
      })
    );
    
    app.get('/auth/google/callback',
      (req, res, next) => {
        passport.authenticate('google', {
          failureRedirect: '/login',
          successRedirect: '/'
        })(req, res, next);
      }
    );
    
    app.get('/auth/logout', (req, res) => {
      req.logout(() => {
        res.redirect('/');
      });
    });
    
    app.get('/api/user', (req, res) => {
      if (req.isAuthenticated()) {
        res.json(req.user);
      } else {
        res.status(401).json({ error: 'Not authenticated' });
      }
    });

    // Test-only route to set session
    app.post('/__test__/session', (req, res) => {
      if (req.body.user) {
        req.login(req.body.user, (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({ success: true });
          }
        });
      } else {
        res.status(400).json({ error: 'No user provided' });
      }
    });
  });

  beforeEach(async () => {
    // Clean up test data
    await db.pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  afterAll(async () => {
    // Clean up test data
    await db.pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  describe('Google OAuth Flow', () => {
    it('should redirect to Google login', async () => {
      const response = await request(app)
        .get('/auth/google')
        .expect(302);
      
      expect(response.header.location).toContain('accounts.google.com');
    });

    it('should handle callback with valid data', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      // Mock passport authenticate to simulate successful auth
      const authenticate = vi.fn((strategy, options) => {
        return (req: express.Request, res: express.Response, next: express.NextFunction) => {
          req.login(mockUser, (err) => {
            if (err) return next(err);
            res.redirect('/');
          });
        };
      });
      
      passport.authenticate = authenticate;

      const response = await request(app)
        .get('/auth/google/callback')
        .expect(302);

      expect(response.header.location).toBe('/');
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/user')
        .expect(401);
    });

    it('should return user data when authenticated', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      const user = await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      const agent = request.agent(app);
      
      // Set up session
      await agent
        .post('/__test__/session')
        .send({ user })
        .expect(200);

      // Now test protected route
      await agent
        .get('/api/user')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            email: mockUser.email,
            display_name: mockUser.display_name
          });
        });
    });
  });

  describe('Logout Flow', () => {
    it('should clear session and redirect', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      const user = await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      const agent = request.agent(app);
      
      // Set up session
      await agent
        .post('/__test__/session')
        .send({ user })
        .expect(200);

      // Test logout
      const response = await agent
        .get('/auth/logout')
        .expect(302);

      expect(response.header.location).toBe('/');

      // Verify session is cleared
      await agent
        .get('/api/user')
        .expect(401);
    });

    it('should handle logout when not logged in', async () => {
      const agent = request.agent(app);
      
      // Try to logout without being logged in
      const response = await agent
        .get('/auth/logout')
        .expect(302);

      expect(response.header.location).toBe('/');

      // Verify still not authenticated
      await agent
        .get('/api/user')
        .expect(401);
    });

    it('should handle multiple logout attempts', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      const user = await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      const agent = request.agent(app);
      
      // Set up session
      await agent
        .post('/__test__/session')
        .send({ user })
        .expect(200);

      // First logout
      await agent
        .get('/auth/logout')
        .expect(302);

      // Second logout
      await agent
        .get('/auth/logout')
        .expect(302);

      // Verify still logged out
      await agent
        .get('/api/user')
        .expect(401);
    });

    it('should clear all user data from session', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      const user = await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      const agent = request.agent(app);
      
      // Set up session with additional data
      await agent
        .post('/__test__/session')
        .send({ 
          user,
          additionalData: {
            preferences: { theme: 'dark' },
            lastAccess: new Date()
          }
        })
        .expect(200);

      // Verify logged in with additional data
      const beforeLogout = await agent
        .get('/api/user')
        .expect(200);

      expect(beforeLogout.body).toMatchObject({
        email: mockUser.email,
        display_name: mockUser.display_name
      });

      // Logout
      await agent
        .get('/auth/logout')
        .expect(302);

      // Verify all session data is cleared
      await agent
        .get('/api/user')
        .expect(401);
    });

    it('should maintain database record after logout', async () => {
      const mockUser = {
        id: 1,
        google_id: 'test123',
        email: 'test@example.com',
        display_name: 'Test User'
      };

      // Create test user
      const user = await db.createUser({
        google_id: mockUser.google_id,
        email: mockUser.email,
        display_name: mockUser.display_name,
        avatar_url: 'https://example.com/photo.jpg'
      });

      const agent = request.agent(app);
      
      // Set up session
      await agent
        .post('/__test__/session')
        .send({ user })
        .expect(200);

      // Logout
      await agent
        .get('/auth/logout')
        .expect(302);

      // Verify user still exists in database
      const dbUser = await db.getUserByGoogleId(mockUser.google_id);
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(mockUser.email);
    });
  });
}); 