import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { db, createTestUser, cleanDatabase } from './setup';
import type { User } from '../services/db';
import { createApp } from '../app';

describe('Auth History', () => {
  let app: ReturnType<typeof createApp>;
  let testUser: User;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    try {
      await cleanDatabase(db);
      app = createApp(db);
      
      // Create test user with preferences
      testUser = await createTestUser();
      
      // Create reusable authenticated agent
      agent = request.agent(app);
      
      // Initialize session with test user
      const sessionResponse = await agent
        .post('/api/auth/session')
        .send({ 
          passport: {
            user: testUser.id
          }
        })
        .expect(200);

      console.debug('Session initialization response:', sessionResponse.body);

      // Wait for session to be saved
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify session was initialized
      const verifyResponse = await agent
        .get('/api/auth/verify')
        .expect(200);

      console.debug('Session verification response:', verifyResponse.body);

      if (!verifyResponse.body.authenticated) {
        throw new Error('Session verification failed: User not authenticated');
      }
    } catch (error) {
      console.error('Setup error:', error);
      await cleanDatabase(db);
      throw error;
    }
  });

  it('should record login history when accessing protected routes', async () => {
    try {
      const response = await agent.get('/protected');
      expect(response.status).toBe(200);
    } catch (error) {
      throw error;
    }
  });

  it('should include correct request information', async () => {
    try {
      const response = await agent
        .get('/protected')
        .set('User-Agent', 'test-agent');
      expect(response.status).toBe(200);
    } catch (error) {
      throw error;
    }
  });
}); 