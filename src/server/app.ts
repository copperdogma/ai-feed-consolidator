import express, { Express } from 'express';
import session from 'express-session';
import cors from 'cors';
import { config } from './config';
import { getServiceContainer } from './services/service-container';
import { LoginHistoryService } from './services/login-history';
import { registerRSSServices } from './services/rss';
import { firebaseAuth, addRequestInfo } from './auth/middleware';
import { logger } from './utils/logger';

export async function createApp(): Promise<Express> {
  const app = express();

  // Configure CORS - allow all origins in development
  let corsOptions;
  if (process.env.NODE_ENV === 'production') {
    corsOptions = {
      origin: config.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  } else {
    // In development, allow specific origin with credentials
    corsOptions = {
      origin: config.clientUrl, // Use specific client URL instead of wildcard
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }
  
  logger.info(`Configuring CORS with origin: ${corsOptions.origin}`);
  app.use(cors(corsOptions));

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(addRequestInfo);

  // Session setup
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Firebase authentication middleware
  app.use(firebaseAuth);

  // Initialize services
  const container = getServiceContainer();
  const loginHistoryService = new LoginHistoryService(container);
  
  // Register RSS services before importing routes
  registerRSSServices(container);
  
  // Import feed routes
  try {
    const feedRoutes = (await import('./routes/feeds')).default;
    app.use('/api/feeds', feedRoutes);
    logger.info('Feed routes registered successfully');
  } catch (error) {
    logger.error('Error importing feed routes:', error);
  }
  
  // Define auth routes directly
  const authRouter = express.Router();
  
  // Verify endpoint
  authRouter.post('/verify', (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
    
    res.json({ user: req.user });
  });
  
  app.use('/api/auth', authRouter);
  logger.info('Auth routes registered successfully');

  // Add a health check endpoint
  app.get('/api/health', (req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  logger.info('Health check endpoint registered');

  return app;
} 