import { beforeAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test-specific environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

// Ensure we're using test database
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Tests must use test database');
  }
}); 