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
    await cleanDatabase(db);
    app = createApp(db);

    // Create test user with preferences and verify it exists
    testUser = await createTestUser();
    console.log('Created test user:', testUser);
    
    // Verify user exists in database
    const userCheck = await db.oneOrNone('SELECT * FROM users WHERE id = $1', [testUser.id]);
    if (!userCheck) {
      throw new Error('Test user was not properly saved to database');
    }
    console.log('Verified test user exists:', userCheck);
    
    // Create reusable authenticated agent
    agent = request.agent(app);
    
    // Log initial session state
    const initialState = await agent.get('/api/auth/verify');
    console.log('Initial session state:', {
      hasSession: !!initialState.body.session,
      hasPassport: !!initialState.body.passport,
      hasUser: !!initialState.body.user,
      sessionId: initialState.body.sessionId
    });

    // Initialize session with test user
    const sessionResponse = await agent
      .post('/api/auth/session')
      .send({ 
        passport: {
          user: testUser.id
        }
      });
    
    console.log('Session initialization response:', {
      status: sessionResponse.status,
      body: sessionResponse.body,
      headers: sessionResponse.headers
    });

    if (sessionResponse.status !== 200) {
      console.error('Session initialization failed:', {
        status: sessionResponse.status,
        body: sessionResponse.body,
        user: testUser
      });
      throw new Error(`Failed to initialize session: ${sessionResponse.body.error || 'Unknown error'}`);
    }

    // Wait for session to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log session state after initialization
    const afterInitState = await agent.get('/api/auth/verify');
    console.log('Session state after initialization:', {
      hasSession: !!afterInitState.body.session,
      hasPassport: !!afterInitState.body.passport,
      hasUser: !!afterInitState.body.user,
      sessionId: afterInitState.body.sessionId,
      user: afterInitState.body.user
    });

    // Verify session was initialized
    const verifyResponse = await agent.get('/api/auth/verify');
    console.log('Session verification response:', {
      status: verifyResponse.status,
      body: verifyResponse.body,
      headers: verifyResponse.headers
    });

    if (!verifyResponse.body.authenticated) {
      console.error('Session verification failed:', {
        response: verifyResponse.body,
        user: testUser
      });
      throw new Error('Session initialization failed: User not authenticated');
    }
  });

  it('should redirect to Google login', async () => {
    // Create a new unauthenticated agent for this test
    const unauthAgent = request(app);
    const response = await unauthAgent.get('/api/auth/google');
    expect(response.status).toBe(302);
    expect(response.header.location).toContain('accounts.google.com');
  });

  it('should handle callback with valid data', async () => {
    // Use the authenticated agent to test the callback
    const response = await agent
      .get('/api/auth/google/callback')
      .query({ code: 'valid-code' });
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/');
  });

  it('should return 401 when not authenticated', async () => {
    // Create a new agent without authentication
    const unauthAgent = request(app);
    await unauthAgent.get('/api/auth/verify').expect(401);
  });

  it('should return success when authenticated', async () => {
    await agent.get('/api/auth/verify').expect(200);
  });
}); 