const { Client } = require('pg');

async function createTestDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    await client.connect();
    
    // Drop database if it exists
    await client.query(
      `DROP DATABASE IF EXISTS "ai-feed-test" WITH (FORCE)`
    );
    console.log('Dropped existing test database');

    // Create database
    await client.query('CREATE DATABASE "ai-feed-test"');
    console.log('Test database created successfully');
  } catch (error) {
    console.error('Error creating test database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestDatabase(); 