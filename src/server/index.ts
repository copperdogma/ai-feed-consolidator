import express, { Request, Response, RequestHandler } from 'express';
import session from 'express-session';
import cors from 'cors';
import { config } from './config';
import passport, { addRequestInfo, requireAuth } from './middleware/auth';
import { pool } from './services/db';
import { LoginHistoryService } from './services/login-history';
import pgPromise from 'pg-promise';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { IncomingMessage, ServerResponse } from 'http';
import { createWriteStream } from 'fs';
import { multistream } from 'pino-multi-stream';

const app = express();

// Initialize pg-promise
const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      logger.error({ err }, 'Database connection error');
    } else if (e.query) {
      logger.error({ err, query: e.query }, 'Database query error');
    } else {
      logger.error({ err }, 'Database error');
    }
  }
});
const db = pgp(config.databaseUrl);

// Initialize services
LoginHistoryService.initialize(db);

// Add request logging middleware early
app.use(pinoHttp({
  autoLogging: {
    ignorePaths: ['/health']
  }
}));

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

app.use(express.json());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Add request info middleware for login history
app.use(addRequestInfo);

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: config.clientUrl,
    failureRedirect: `${config.clientUrl}/login?error=true`
  })
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    logger.info({ userId: req.user?.id }, 'User logged out');
    res.redirect(config.clientUrl);
  });
});

// Protected routes
const userHandler: RequestHandler = (req, res) => {
  logger.debug({ user: req.user }, 'User data requested');
  res.json(req.user);
};

app.get('/api/user', requireAuth, userHandler);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with error handling
const server = app.listen(config.port)
  .on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} is already in use. Please:
      1. Check if another instance is running
      2. Kill the process using: lsof -i :${config.port} | grep LISTEN
      3. Try a different port by setting PORT environment variable`);
      process.exit(1);
    } else {
      logger.error({ err: error }, 'Failed to start server');
      process.exit(1);
    }
  })
  .on('listening', () => {
    logger.info(`Server running on port ${config.port}`);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    db.$pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    db.$pool.end();
    process.exit(0);
  });
}); 