import { Pool } from 'pg';
import { TestDataFactory } from './utils/factories.js';
import { fileURLToPath } from 'url';

// Create a pool instance for the test database
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL,
});

async function createSeedUser(): Promise<void> {
  const factory = TestDataFactory.getInstance();
  factory.setPool(pool);
  await factory.initialize();

  // Check if a user with id 1 exists
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [1]);
    if (result.rows.length === 0) {
      // Create a seed user
      const user = await factory.createUser({
        email: 'seed@example.com',
        display_name: 'Seed User'
      });
      console.log('Seed user created with id:', user.id);
    } else {
      console.log('Seed user already exists');
    }
  } finally {
    client.release();
  }
}

// Execute the seed setup if run directly
if ((typeof import.meta !== 'undefined' && process.argv[1] === fileURLToPath(import.meta.url)) || (typeof require !== 'undefined' && require.main === module)) {
  createSeedUser()
    .then(() => {
      console.log('Test seed setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error setting up test seed:', error);
      process.exit(1);
    });
}

export default createSeedUser; 