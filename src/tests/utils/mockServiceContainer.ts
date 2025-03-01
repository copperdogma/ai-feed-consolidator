/*
 * mockServiceContainer.ts
 *
 * This is a mock implementation of ServiceContainer for testing purposes.
 * It provides a getPool method returning a properly configured database pool using the test database connection string.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/ai-feed-test'
});

export const mockServiceContainer = {
  getPool: () => pool,
  // Add other stub methods if necessary
  getService: (name: string) => {
    // Return dummy services or undefined as needed in tests
    return undefined;
  }
};

export default mockServiceContainer; 