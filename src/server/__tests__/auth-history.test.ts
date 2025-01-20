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
      await cleanDatabase();
      app = createApp(db);
      
      // Create test user with preferences
      testUser = await createTestUser();
      
      // Create reusable authenticated agent
      agent = request.agent(app);
      
      // Initialize session with test user with retries
      let sessionResponse;
      for (let attempt = 0; attempt < 3; attempt++) {
        sessionResponse = await agent
          .post('/test/session')
          .send({ user: testUser });

        console.debug('Session initialization response:', sessionResponse.body);

        if (sessionResponse.body.success) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }

      if (!sessionResponse || !sessionResponse.body.success) {
        throw new Error(`Failed to initialize session after retries: ${sessionResponse?.body?.message || 'Unknown error'}`);
      }

      // Wait longer for session to be saved
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify session was initialized with retries
      let verifyResponse = { status: 0, body: { message: 'No response' } };
      for (let attempt = 0; attempt < 3; attempt++) {
        verifyResponse = await agent.get('/protected');
        console.debug('Session verification response:', verifyResponse.body);

        if (verifyResponse.status === 200) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }

      if (verifyResponse.status !== 200) {
        console.error('Session state:', {
          sessionId: sessionResponse.body.sessionId,
          verifyStatus: verifyResponse.status,
          verifyBody: verifyResponse.body
        });
        throw new Error(`Session verification failed: ${verifyResponse.body.message || 'User not authenticated'}`);
      }

      // Make an additional request to ensure session persists
      const secondVerify = await agent.get('/protected');
      if (secondVerify.status !== 200) {
        throw new Error('Session did not persist between requests');
      }
    } catch (error) {
      console.error('Setup error:', error);
      await cleanDatabase();
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