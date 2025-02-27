import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';
import { initializeDatabase } from './services/db';
import { FeedPoller } from './jobs/poll-feeds';
import { db } from './db/db';
import { ServiceContainer } from './services/service-container';

// Register database pool with service container first
const container = ServiceContainer.getInstance();
container.register('pool', db);
container.register('databasePool', db);
await container.initialize();

// Initialize database 
await initializeDatabase();

// Create the Express app
const app = await createApp();

// Start polling feeds in the background if not in test mode
let feedPoller: FeedPoller | null = null;
if (process.env.NODE_ENV !== 'test') {
  feedPoller = new FeedPoller();
  feedPoller.start();
}

// Start the server
const server = app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    if (feedPoller) {
      feedPoller.stop();
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    if (feedPoller) {
      feedPoller.stop();
    }
    process.exit(0);
  });
}); 