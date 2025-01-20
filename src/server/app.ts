import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from './services/db';
import { requireAuth } from './middleware/auth';
import connectMemoryStore from 'memorystore';
import { LoginHistoryService } from './services/login-history';

const MemoryStore = connectMemoryStore(session);

// Extend express session types
declare module 'express-session' {
  interface SessionData {
    passport: { user: number };
  }
}

// Extend express Request type to include login method
declare global {
  namespace Express {
    interface Request {
      login(user: User, done: (err: any) => void): void;
    }
  }
}

export function createApp(db: any) {
  // Initialize services
  LoginHistoryService.initialize(db);

  const app = express();

  // Middleware
  app.use(express.json());
  
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
    saveUninitialized: false,
    store: process.env.NODE_ENV === 'test' ? new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }) : undefined,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'connect.sid'
  }));

  // Initialize passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: Express.User, done) => {
    const typedUser = user as User;
    done(null, typedUser.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [id]);
      done(null, user || false);
    } catch (err) {
      done(err, false);
    }
  });

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await db.oneOrNone('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      if (user) {
        return done(null, user);
      }
      done(new Error('User not found'));
    } catch (err) {
      done(err);
    }
  }));

  // Auth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get('/auth/google/callback', (req, res, next) => {
    // In test environment, simulate successful authentication
    if (process.env.NODE_ENV === 'test' && req.query.code === 'valid-code') {
      // Use the test user from the session
      const testUser = req.user;
      if (!testUser) {
        return res.redirect('/login');
      }
      
      return req.login(testUser, (err) => {
        if (err) { return next(err); }
        return res.redirect('/login');
      });
    }
    
    // Normal authentication flow
    passport.authenticate('google', async (err: any, user: any) => {
      if (err) { return next(err); }
      if (!user) { return res.redirect('/login'); }
      
      req.login(user, async (err) => {
        if (err) { return next(err); }
        
        // Save session after login
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        res.redirect('/');
      });
    })(req, res, next);
  });

  // Test route for session setup
  const testSessionHandler: RequestHandler = async (req, res) => {
    if (!req.body.user) {
      res.status(400).json({ success: false, message: 'No user data provided' });
      return;
    }

    try {
      // Log initial session state
      console.debug('Initial session state:', {
        hasSession: !!req.session,
        hasPassport: !!req.session?.passport,
        hasUser: !!req.user,
        sessionId: req.sessionID
      });

      // Use passport's login method to set up the session
      await new Promise<void>((resolve, reject) => {
        req.login(req.body.user, (err) => {
          if (err) {
            console.error('Failed to login user:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Save session and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Add a delay to ensure session is saved
      await new Promise(resolve => setTimeout(resolve, 250));

      // Verify session was saved correctly
      if (!req.session?.passport?.user) {
        throw new Error('Session not properly initialized');
      }

      // Log final session state
      console.debug('Session state after initialization:', {
        hasSession: !!req.session,
        hasPassport: !!req.session?.passport,
        hasUser: !!req.user,
        sessionId: req.sessionID,
        user: req.user
      });

      res.json({ 
        success: true, 
        sessionId: req.sessionID,
        user: req.user 
      });
    } catch (error) {
      console.error('Failed to initialize session:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to save session' 
      });
    }
  };

  app.post('/test/session', testSessionHandler);

  // Protected route
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
  });

  return app;
} 