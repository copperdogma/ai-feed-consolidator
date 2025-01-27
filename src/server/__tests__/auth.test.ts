import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { createTestUser, cleanupDatabase } from './setup';
import type { User } from '../services/db';
import { createApp } from '../app';
import { promisify } from 'util';
import { pool } from '../services/db';
import { Express } from 'express';
import { Server } from 'http';

const sleep = promisify(setTimeout);

// Set test environment
beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

// Verify that a test user exists in the database
async function verifyTestUser(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

describe('Authentication Flow', () => {
  let app: Express;
  let testUser: User;
  let agent: ReturnType<typeof request.agent>;
  let server: Server;

  beforeEach(async () => {
    // Clean database and create app
    await cleanupDatabase();
    app = await createApp();
    server = app.listen();

    // Create test user with preferences and verify it exists
    testUser = await createTestUser();
    const verifiedUser = await verifyTestUser(testUser.id);
    if (!verifiedUser) {
      throw new Error('Test user was not properly saved to database');
    }
    console.log('Created and verified test user:', verifiedUser);
    
    // Create reusable authenticated agent
    agent = request.agent(server);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  });

  it('should redirect to Google login', async () => {
    // Create a new unauthenticated agent for this test
    const unauthAgent = request(server);
    const response = await unauthAgent.get('/api/auth/google');
    expect(response.status).toBe(302);
    expect(response.header.location).toContain('accounts.google.com');
  });

  it('should handle callback with valid data', async () => {
    // Create a new unauthenticated agent for this test
    const unauthAgent = request.agent(server);  // Use agent() to maintain cookies
    
    // First verify we're not authenticated
    let verifyResponse = await unauthAgent.get('/api/auth/verify');
    console.debug('Initial verification request:', {
      status: verifyResponse.status,
      body: verifyResponse.body
    });
    expect(verifyResponse.status).toBe(401);
    expect(verifyResponse.body.authenticated).toBe(false);

    // Initialize session with test user with retries
    let sessionResponse: request.Response | undefined;
    let maxRetries = 5;
    let retryCount = 0;
    let success = false;

    while (!success && retryCount < maxRetries) {
      try {
        sessionResponse = await unauthAgent
          .post('/api/auth/session')
          .send({
            passport: { 
              user: testUser.id,
              google_id: testUser.google_id,
              email: testUser.email,
              display_name: testUser.display_name,
              avatar_url: testUser.avatar_url
            }
          });
        console.debug(`Session initialization attempt ${retryCount + 1}:`, {
          status: sessionResponse.status,
          body: sessionResponse.body
        });

        if (sessionResponse.status === 200 && sessionResponse.body.sessionId) {
          success = true;
        } else {
          retryCount++;
          await sleep(1000); // Wait before retrying
        }
      } catch (error) {
        console.error(`Session initialization error (attempt ${retryCount + 1}):`, error);
        retryCount++;
        await sleep(1000); // Wait before retrying
      }
    }

    if (!success || !sessionResponse) {
      throw new Error(`Failed to initialize session after ${maxRetries} attempts`);
    }

    expect(sessionResponse.body.sessionId).toBeDefined();
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.user.id).toBe(testUser.id);

    // Add a delay to ensure session is fully established
    await sleep(1000);

    // Verify we are now authenticated with retries
    maxRetries = 3;
    retryCount = 0;
    success = false;

    while (!success && retryCount < maxRetries) {
      try {
        verifyResponse = await unauthAgent.get('/api/auth/verify');
        console.debug(`Verification attempt ${retryCount + 1}:`, {
          status: verifyResponse.status,
          body: verifyResponse.body,
          sessionId: verifyResponse.body.sessionId
        });

        if (verifyResponse.status === 200 && 
            verifyResponse.body.authenticated && 
            verifyResponse.body.sessionId === sessionResponse.body.sessionId) {
          success = true;
        } else {
          retryCount++;
          await sleep(1000); // Wait before retrying
        }
      } catch (error) {
        console.error(`Verification error (attempt ${retryCount + 1}):`, error);
        retryCount++;
        await sleep(1000); // Wait before retrying
      }
    }

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.authenticated).toBe(true);
    expect(verifyResponse.body.user?.id).toBe(testUser.id);
    expect(verifyResponse.body.sessionId).toBe(sessionResponse.body.sessionId);
  });

  it('should return success when authenticated', async () => {
    // Initialize session with test user
    const sessionResponse = await agent
      .post('/api/auth/session')
      .send({
        passport: { 
          user: testUser.id,
          google_id: testUser.google_id,
          email: testUser.email,
          display_name: testUser.display_name,
          avatar_url: testUser.avatar_url
        }
      });

    // Verify session initialization was successful
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.user.id).toBe(testUser.id);
    expect(sessionResponse.body.sessionId).toBeDefined();

    // Add a delay to ensure session is fully established
    await sleep(1000);

    // Verify session state
    const verifyResponse = await agent.get('/api/auth/verify');
    
    // Log session state for debugging
    console.log('Session state:', {
      sessionId: verifyResponse.body.sessionId,
      hasSession: !!verifyResponse.body.sessionId,
      hasPassport: !!verifyResponse.body.user,
      isAuthenticated: verifyResponse.body.authenticated,
      user: verifyResponse.body.user
    });

    // Verify authentication state
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.authenticated).toBe(true);
    expect(verifyResponse.body.user?.id).toBe(testUser.id);
    expect(verifyResponse.body.sessionId).toBe(sessionResponse.body.sessionId);
  });

  it('should return 401 when not authenticated', async () => {
    // Create a new unauthenticated agent
    const unauthAgent = request(server);
    const response = await unauthAgent.get('/api/auth/verify');
    expect(response.status).toBe(401);
    expect(response.body.authenticated).toBe(false);
  });
}); 