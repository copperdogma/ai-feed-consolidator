import { describe, it, expect, beforeEach } from 'vitest';
import { pool, User } from '../db';
import { cleanupDatabase } from '../../__tests__/setup';

describe('Database Service', () => {
  describe('User Operations', () => {
    beforeEach(async () => {
      await cleanupDatabase();
    });

    it('should create a new user', async () => {
      const result = await pool.query<User>(
        `INSERT INTO users (google_id, email, display_name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        ['test-id', 'test@example.com', 'Test User', 'https://example.com/avatar.jpg']
      );

      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0].google_id).toBe('test-id');
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
    beforeEach(async () => {
      await cleanupDatabase();
    });

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