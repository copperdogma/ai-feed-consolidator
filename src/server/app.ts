import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool, User } from './services/db';
import { UserService } from './services/user';
import { LoginHistoryService } from './services/login-history';
import connectMemoryStore from 'memorystore';
import { requireAuth } from './middleware/auth';
import { config } from './config';

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

// Create Express app instance
const app = express();

export function createApp(): Express {
  // Initialize services
  LoginHistoryService.initialize(pool);

  // Middleware
  app.use(express.json());
  
  // Configure session middleware
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
      stale: false
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    },
    name: 'connect.sid',
    rolling: true
  }));

  // Initialize passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: Express.User, done) => {
    const typedUser = user as User;
    console.log('Serializing user:', { userId: typedUser.id });
    done(null, typedUser.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', { userId: id });
      
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      const user = result.rows[0];
      if (!user) {
        console.warn('User not found during deserialization', { userId: id });
        return done(null, false);
      }

      console.log('Successfully deserialized user:', { userId: id });
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err, false);
    }
  });

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      if (!profile || !profile.id) {
        console.error('Invalid profile data', { profile });
        return done(null, false, { message: 'Invalid profile data' });
      }

      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      const user = result.rows[0];
      if (user) {
        return done(null, user);
      }

      // User not found - this is expected in test environment
      if (process.env.NODE_ENV === 'test') {
        return done(null, false, { message: 'User not found' });
      }

      // In production, we would create a new user here
      done(null, false, { message: 'User not found' });
    } catch (err) {
      console.error('Error in Google strategy:', err);
      done(err);
    }
  }));

  // Auth routes
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get('/api/auth/google/callback', 
    (async (req: Request, res: Response, next: NextFunction) => {
      // In test environment, simulate successful authentication
      if (process.env.NODE_ENV === 'test' && req.query.code === 'valid-code') {
        try {
          // Parse the mock profile from query parameter
          const mockProfile = req.query.profile ? JSON.parse(req.query.profile as string) : null;
          if (!mockProfile || !mockProfile.id) {
            console.error('No mock profile provided');
            res.status(400).json({ error: 'No mock profile provided' });
            return;
          }

          // Look up the test user by Google ID
          const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [mockProfile.id]);
          const testUser = result.rows[0];
          if (!testUser) {
            console.error('Test user not found:', { googleId: mockProfile.id });
            res.status(401).json({ error: 'Test user not found' });
            return;
          }

          // Ensure session exists
          if (!req.session) {
            console.error('Session not initialized');
            res.status(500).json({ error: 'Session not initialized' });
            return;
          }

          // Log in the user and wait for session to be saved
          await new Promise<void>((resolve, reject) => {
            req.login(testUser, (err) => {
              if (err) {
                console.error('Failed to log in user:', err);
                reject(err);
                return;
              }
              req.session.save((err) => {
                if (err) {
                  console.error('Failed to save session:', err);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          });

          console.log('Test user logged in:', {
            sessionId: req.sessionID,
            passport: req.session.passport,
            user: req.user,
            authenticated: req.isAuthenticated()
          });

          res.redirect('/');
          return;
        } catch (err) {
          console.error('Error in test callback:', err);
          next(err);
          return;
        }
      }
      next();
    }) as RequestHandler,
    passport.authenticate('google', {
      successRedirect: '/',
      failureRedirect: '/login'
    })
  );

  // Session verification endpoint
  app.get('/api/auth/verify', async (req: Request, res: Response) => {
    // Log session state for debugging
    console.debug('Session verification request:', {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      hasPassport: !!req.session?.passport,
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });

    // Record login attempt
    try {
      const user = req.user as User | undefined;
      await LoginHistoryService.recordLoginAttempt({
        userId: user?.id || null,
        success: !!user,
        ipAddress: req.ip || req.socket.remoteAddress || '',
        userAgent: req.get('user-agent') || '',
        loginTime: new Date(),
        requestPath: req.path,
        failureReason: user ? undefined : 'Not authenticated'
      });
    } catch (error) {
      console.error('Failed to record login attempt:', error);
      // Don't fail the request just because we couldn't record it
    }

    // Return session state
    const response = {
      authenticated: req.isAuthenticated(),
      session: req.session,
      passport: req.session?.passport,
      user: req.user,
      sessionId: req.sessionID
    };

    console.debug('Session verification response:', response);

    if (req.isAuthenticated()) {
      res.json(response);
    } else {
      res.status(401).json(response);
    }
  });

  // Session initialization endpoint for tests
  app.post('/api/auth/session', (async (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== 'test') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Initialize session with provided user
    const { passport } = req.body;
    if (!passport || !passport.user) {
      res.status(400).json({ error: 'Invalid session data' });
      return;
    }

    try {
      // Get the user from the database
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [passport.user]);
      const user = result.rows[0];
      
      if (!user) {
        console.warn('User not found during session initialization', { userId: passport.user });
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Initialize session
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            console.error('Failed to log in user:', err);
            reject(err);
            return;
          }
          req.session.save((err) => {
            if (err) {
              console.error('Failed to save session:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

      console.log('Session initialized successfully:', {
        sessionId: req.sessionID,
        passport: req.session.passport,
        user: req.user,
        authenticated: req.isAuthenticated()
      });

      res.json({
        authenticated: req.isAuthenticated(),
        session: req.session,
        passport: req.session.passport,
        user: req.user,
        sessionId: req.sessionID
      });

    } catch (err) {
      console.error('Error initializing session:', err);
      res.status(500).json({ error: 'Failed to initialize session' });
    }
  }) as RequestHandler);

  // Protected route example
  app.get('/api/protected', requireAuth, ((req: Request, res: Response) => {
    res.json({ user: req.user });
  }) as RequestHandler);

  // Protected route
  app.get('/protected', requireAuth, ((req: Request, res: Response) => {
    res.json({ message: 'Access granted', user: req.user });
  }) as RequestHandler);

  return app;
}

export { app }; 