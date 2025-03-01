import pgPromise from 'pg-promise';
import { IInitOptions, IDatabase, IMain } from 'pg-promise';
import { IConnectionParameters } from 'pg-promise/typescript/pg-subset';
import { logger } from '../logger';

// Database connection configuration
const config: IConnectionParameters = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'ai-feed-dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// pg-promise initialization options
const initOptions: IInitOptions = {
  // Event handlers for database connection lifecycle
  connect(e) {
    logger.info('Connected to database', { client: e.client.processID });
  },
  disconnect(e) {
    logger.info('Disconnected from database', { client: e.client.processID });
  },
  error(err, e) {
    logger.error('Database error', { error: err, query: e?.query });
  }
};

// Initialize pg-promise with options
const pgp: IMain = pgPromise(initOptions);

// Create the database instance
const db: IDatabase<any> = pgp(config);

export { db, pgp }; 