import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cors from 'cors';
import { pool, User } from './services/db';
import { UserService } from './services/user';
import { LoginHistoryService } from './services/login-history';
import { FeedItemService } from './services/feed-item';
import connectMemoryStore from 'memorystore';
import { requireAuth, addRequestInfo } from './middleware/auth';
import { config } from './config';
import { ContentProcessor } from './services/content-processor';
import { OpenAIService } from './services/openai';
import { ProcessedFeedItem } from './types/feed';
import { logger } from './logger';
import feedRoutes from './routes/feeds';

const MemoryStore = connectMemoryStore(session);

// Initialize services
const feedItemService = new FeedItemService(pool);

// Configure passport serialization
passport.serializeUser((user: Express.User, done) => {
  const typedUser = user as User;
  done(null, typedUser.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await UserService.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

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

// Route handlers
const getFeedItems = async (req: Request, res: Response) => {
  const userId = Number(req.user?.id);
  if (!userId || isNaN(userId)) {
    logger.warn({ userId: req.user?.id }, 'Get feed items attempted without valid user ID');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const feedItems = await feedItemService.getSavedItems(userId);
    res.json(feedItems);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, userId }, 'Failed to fetch feed items');
    res.status(500).json({ error: 'Failed to fetch feed items' });
  }
};

const toggleSavedStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = Number(req.user?.id);
  if (!userId || isNaN(userId)) {
    logger.warn({ userId: req.user?.id }, 'Toggle saved attempted without valid user ID');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { saved } = req.body;

  if (typeof saved !== 'boolean') {
    logger.warn({ saved }, 'Invalid saved parameter');
    res.status(400).json({ error: 'Invalid saved parameter' });
    return;
  }

  logger.info({ id, saved, userId }, 'Toggle saved request');

  try {
    await feedItemService.updateItemState(userId, id, { isSaved: saved });
    logger.info({ id, saved, userId }, 'Successfully toggled saved state');
    res.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, id, saved, userId }, 'Failed to toggle saved state');
    res.status(500).json({ error: 'Failed to toggle saved state' });
  }
};

export async function createApp(): Promise<Express> {
  const app = express();

  // Initialize services
  LoginHistoryService.initialize(pool);

  // Middleware setup
  app.use(express.json());
  app.use(cors({
    origin: config.clientUrl,
    credentials: true
  }));

  // Configure session middleware
  app.use(session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize passport and session
  app.use(passport.initialize());
  app.use(passport.session());

  // Add request info middleware globally
  app.use(addRequestInfo);

  // Add session debugging middleware in test environment
  if (process.env.NODE_ENV === 'test') {
    app.use((req, res, next) => {
      // Save session after the response is sent
      const oldEnd = res.end;
      res.end = function (chunk: any, encoding: BufferEncoding, cb?: () => void) {
        if (req.session) {
          // Ensure session ID is set
          if (!req.sessionID) {
            req.sessionID = require('crypto').randomBytes(16).toString('hex');
            logger.debug('Generated missing session ID:', req.sessionID);
          }
          req.session.save((err) => {
            if (err) {
              logger.error({ err }, 'Error saving session');
            }
            oldEnd.apply(res, [chunk, encoding, cb]);
          });
        } else {
          oldEnd.apply(res, [chunk, encoding, cb]);
        }
      } as any;
      next();
    });
  }

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: `${config.serverUrl}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      if (!profile || !profile.id) {
        console.error('Invalid profile data', { profile });
        return done(null, false, { message: 'Invalid profile data' });
      }

      const { user } = await UserService.findOrCreateGoogleUser(profile);
      return done(null, user);
    } catch (err) {
      console.error('Error in Google strategy:', err);
      done(err);
    }
  }));

  // Auth routes
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', passport.authenticate('google', {
    successRedirect: config.clientUrl,
    failureRedirect: `${config.clientUrl}/login`
  }));

  // Mount auth routes
  app.use('/api/auth', (await import('./routes/auth.ts')).default);

  // Protected routes
  app.get('/api/feed/items', requireAuth, getFeedItems);
  app.post('/api/feed/items/:id/toggle-saved', requireAuth, toggleSavedStatus);

  return app;
}

// Remove the standalone app export
// export { app }; 