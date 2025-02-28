import express, { Express } from 'express';
import session from 'express-session';
import { config } from './config';
import { getServiceContainer } from './services/service-container';
import { LoginHistoryService } from './services/login-history';
import { registerRSSServices } from './services/rss';
import { firebaseAuth, addRequestInfo } from './auth/middleware';

export async function createApp(): Promise<Express> {
  const app = express();

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
  
  // Import routes after services are registered
  // This ensures that when the routes module is loaded, the services are already registered
  const feedRoutes = (await import('./routes/feeds')).default;
  const authRoutes = (await import('./routes/auth')).default;
  
  // Routes
  app.use('/api/feeds', feedRoutes);
  app.use('/api/auth', authRoutes);

  return app;
} 