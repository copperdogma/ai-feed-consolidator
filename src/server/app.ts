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

  // Configure CORS with specific origin
  const corsOptions = {
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
  
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
  container.register('loginHistoryService', loginHistoryService);
  
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
  
  // Import the verifyAuth function
  const { verifyAuth } = await import('./auth/verify');
  
  // Verify endpoint
  authRouter.post('/verify', async (req, res) => {
    await verifyAuth(req, res);
  });
  
  app.use('/api/auth', authRouter);
  logger.info('Auth routes registered successfully');

  // Add a health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
    logger.info('Health check endpoint called');
  });
  logger.info('Health check endpoint registered');

  return app;
} 