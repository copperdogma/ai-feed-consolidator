import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestUser } from '../../__tests__/setup';
import { pool } from '../../services/db';

describe('Database Service', () => {
  let testUser: any;

  // Set up test user once for all tests
  beforeAll(async () => {
    // Create test user with preferences in a single query
    testUser = await createTestUser();
  });

  // Clean up database before each test
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users CASCADE');
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const result = await pool.query(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['new_test_id', 'new@example.com', 'New Test User']
      );
      const user = result.rows[0];

      expect(user).toBeDefined();
      expect(user.google_id).toBe('new_test_id');
      expect(user.email).toBe('new@example.com');
    });

    it('should find a user by Google ID', async () => {
      const result = await pool.query(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['find_test_id', 'find@example.com', 'Find Test User']
      );
      const user = result.rows[0];

      const foundResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [user.google_id]);
      const found = foundResult.rows[0];
      expect(found).toBeDefined();
      expect(found?.email).toBe('find@example.com');
    });

    it('should update user data', async () => {
      const result = await pool.query(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['update_test_id', 'update@example.com', 'Update Test User']
      );
      const user = result.rows[0];

      const updatedResult = await pool.query(
        'UPDATE users SET email = $1, display_name = $2 WHERE id = $3 RETURNING *',
        ['updated@example.com', 'Updated User', user.id]
      );
      const updated = updatedResult.rows[0];

      expect(updated.email).toBe('updated@example.com');
      expect(updated.display_name).toBe('Updated User');
    });
  });

  describe('User Preferences', () => {
    it('should get user preferences', async () => {
      const userResult = await pool.query(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['pref_test_id', 'pref@example.com', 'Pref Test User']
      );
      const user = userResult.rows[0];

      const prefsResult = await pool.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING *',
        [user.id]
      );
      const prefs = prefsResult.rows[0];

      expect(prefs).toBeDefined();
      expect(prefs.user_id).toBe(user.id);
    });

    it('should update user preferences', async () => {
      const userResult = await pool.query(
        'INSERT INTO users (google_id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
        ['pref_update_id', 'pref_update@example.com', 'Pref Update User']
      );
      const user = userResult.rows[0];

      await pool.query(
        'INSERT INTO user_preferences (user_id) VALUES ($1) RETURNING *',
        [user.id]
      );

      const updatedResult = await pool.query(
        'UPDATE user_preferences SET theme = $1 WHERE user_id = $2 RETURNING *',
        ['dark', user.id]
      );
      const updated = updatedResult.rows[0];

      expect(updated.theme).toBe('dark');
    });
  });
}); 