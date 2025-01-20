import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { db, createTestUser, cleanDatabase } from './setup';
import type { User } from '../services/db';
import { createApp } from '../app';

describe('Authentication Flow', () => {
  let app: ReturnType<typeof createApp>;
  let testUser: User;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    // Clean database and create app with db instance
    await cleanDatabase();
    app = createApp(db);

    // Create test user with preferences
    testUser = await createTestUser();
    console.log('Created test user:', testUser);
    
    // Create reusable authenticated agent
    agent = request.agent(app);
    
    // Initialize session with test user with retries
    let sessionResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
      sessionResponse = await agent
        .post('/test/session')
        .send({ user: testUser });
      
      console.log('Session initialization response:', {
        status: sessionResponse.status,
        body: sessionResponse.body,
        headers: sessionResponse.headers
      });

      if (sessionResponse.status === 200) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }

    if (!sessionResponse || sessionResponse.status !== 200) {
      throw new Error(`Failed to initialize session after retries: ${sessionResponse?.body?.error || 'Unknown error'}`);
    }

    // Wait longer for session to be saved
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify session was initialized with retries
    let verifyResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
      verifyResponse = await agent.get('/protected');
      
      console.log('Session verification response:', {
        status: verifyResponse.status,
        body: verifyResponse.body,
        headers: verifyResponse.headers
      });

      if (verifyResponse.status === 200) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }

    if (!verifyResponse || verifyResponse.status !== 200) {
      throw new Error('Session initialization failed: User not authenticated');
    }
  });

  it('should redirect to Google login', async () => {
    // Create a new unauthenticated agent for this test
    const unauthAgent = request(app);
    const response = await unauthAgent.get('/auth/google');
    expect(response.status).toBe(302);
    expect(response.header.location).toContain('accounts.google.com');
  });

  it('should handle callback with valid data', async () => {
    // Use the authenticated agent to test the callback
    const response = await agent
      .get('/auth/google/callback')
      .query({ code: 'valid-code' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/login');
  });

  it('should return 401 when not authenticated', async () => {
    // Create a new agent without authentication
    const unauthAgent = request(app);
    await unauthAgent.get('/protected').expect(401);
  });

  it('should return success when authenticated', async () => {
    await agent.get('/protected').expect(200);
  });
}); 