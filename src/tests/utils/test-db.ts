import { Pool } from 'pg';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

/**
 * Set up a test database connection
 */
export async function setupTestDatabase(): Promise<Pool> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Verify connection
  try {
    await pool.query('SELECT NOW()');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  return pool;
}

/**
 * Clean up test database connection and data
 */
export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  try {
    // Clean up test data
    await pool.query('DELETE FROM feed_health');
    await pool.query('DELETE FROM feed_configs');
    
    // Close pool
    await pool.end();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
} 