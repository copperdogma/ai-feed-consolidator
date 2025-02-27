import express, { Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import { config } from './config';
import { getServiceContainer } from './services/service-container';
import { LoginHistoryService } from './services/login-history';
import { configurePassport } from './auth/passport';
import { registerRSSServices } from './services/rss';

export async function createApp(): Promise<Express> {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();

  // Initialize services
  const container = getServiceContainer();
  const loginHistoryService = new LoginHistoryService(container);
  
  // Register RSS services before importing routes
  registerRSSServices(container);
  
  // Import routes after services are registered
  // This ensures that when the routes module is loaded, the services are already registered
  const feedRoutes = (await import('./routes/feeds')).default;
  
  // Routes
  app.use('/api/feeds', feedRoutes);

  return app;
} 