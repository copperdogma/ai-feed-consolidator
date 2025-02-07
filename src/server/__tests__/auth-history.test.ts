import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { cleanupDatabase as cleanDatabase, createTestUser } from './setup';
import type { User } from '../services/db';
import { createApp } from '../app';
import { pool } from '../services/db';
import type { Express } from 'express';
import type { Server } from 'http';

describe('Auth History', () => {
  let app: Express;
  let server: Server;
  let testUser: User;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    try {
      await cleanDatabase();
      app = await createApp();
      server = app.listen();
      
      // Create test user with preferences
      testUser = await createTestUser();
      console.log('Created test user:', testUser);
      
      // Create reusable authenticated agent
      agent = request.agent(server);
      
      // Initialize session with test user with retries
      let sessionResponse;
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries) {
        sessionResponse = await agent
          .post('/api/auth/session')
          .send({ 
            passport: {
              user: testUser.id
            }
          });

        if (sessionResponse.status === 200 && sessionResponse.body.authenticated) {
          // Wait for session to be saved
          await new Promise(resolve => setTimeout(resolve, 100));
          break;
        }

        console.log(`Session initialization attempt ${retries + 1} failed:`, sessionResponse.body);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!sessionResponse || sessionResponse.status !== 200) {
        console.error('Session initialization failed:', sessionResponse?.body);
        throw new Error(`Failed to initialize session: ${sessionResponse?.body?.error || 'Unknown error'}`);
      }

      // Verify session was initialized with retries
      let verifyResponse;
      retries = 0;

      while (retries < maxRetries) {
        verifyResponse = await agent.get('/api/auth/verify');
        console.log('Session verification response:', verifyResponse.body);

        if (verifyResponse.status === 200 && verifyResponse.body.authenticated && verifyResponse.body.user?.id === testUser.id) {
          break;
        }

        console.log(`Session verification attempt ${retries + 1} failed:`, verifyResponse.body);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!verifyResponse || verifyResponse.status !== 200 || !verifyResponse.body.authenticated || verifyResponse.body.user?.id !== testUser.id) {
        console.error('Session verification failed:', verifyResponse?.body);
        throw new Error('Session initialization failed: User not authenticated');
      }
    } catch (error) {
      console.error('Setup error:', error);
      await cleanDatabase();
      throw error;
    }
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should record login history when accessing protected routes', async () => {
    try {
      // First verify should be successful
      const response = await agent
        .get('/api/auth/verify')
        .expect(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user?.id).toBe(testUser.id);

      // Check login history
      const historyResult = await pool.query(
        'SELECT * FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testUser.id]
      );
      expect(historyResult.rows.length).toBe(1);
      expect(historyResult.rows[0].success).toBe(true);
      expect(historyResult.rows[0].request_path).toBe('/api/auth/verify');
    } catch (error) {
      throw error;
    }
  });

  it('should include correct request information', async () => {
    try {
      const userAgent = 'test-agent';
      const response = await agent
        .get('/api/auth/verify')
        .set('User-Agent', userAgent)
        .expect(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.user?.id).toBe(testUser.id);

      // Check login history
      const historyResult = await pool.query(
        'SELECT * FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testUser.id]
      );
      expect(historyResult.rows.length).toBe(1);
      expect(historyResult.rows[0].success).toBe(true);
      expect(historyResult.rows[0].request_path).toBe('/api/auth/verify');
      expect(historyResult.rows[0].user_agent).toBe(userAgent);
    } catch (error) {
      throw error;
    }
  });
}); 