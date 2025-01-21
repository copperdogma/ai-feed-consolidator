import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestUser, cleanupDatabase } from './setup';
import type { User } from '../services/db';
import { createApp } from '../app';
import { promisify } from 'util';
import { app } from '../app';
import { pool } from '../services/db';

const sleep = promisify(setTimeout);

// Verify that a test user exists in the database
async function verifyTestUser(userId: number): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

describe('Authentication Flow', () => {
  let app: ReturnType<typeof createApp>;
  let testUser: User;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    // Clean database and create app
    await cleanupDatabase();
    app = createApp();

    // Create test user with preferences and verify it exists
    testUser = await createTestUser();
    const verifiedUser = await verifyTestUser(testUser.id);
    if (!verifiedUser) {
      throw new Error('Test user was not properly saved to database');
    }
    console.log('Created and verified test user:', verifiedUser);
    
    // Create reusable authenticated agent
    agent = request.agent(app);

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
        break;
      }

      console.log(`Session initialization attempt ${retries + 1} failed:`, sessionResponse.body);
      retries++;
      if (retries < maxRetries) {
        await sleep(1000); // Increased sleep time
      }
    }

    if (!sessionResponse || sessionResponse.status !== 200) {
      console.error('Session initialization failed:', sessionResponse?.body);
      throw new Error(`Failed to initialize session: ${sessionResponse?.body?.error || 'Unknown error'}`);
    }

    // Verify session was initialized
    const verifyResponse = await agent.get('/api/auth/verify');
    console.log('Session verification response:', verifyResponse.body);

    if (!verifyResponse.body.authenticated || verifyResponse.body.user?.id !== testUser.id) {
      console.error('Session verification failed:', verifyResponse.body);
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
    // Mock the Google OAuth callback
    const mockProfile = {
      id: testUser.google_id,
      displayName: testUser.display_name,
      emails: [{ value: testUser.email }],
      photos: [{ value: testUser.avatar_url }]
    };

    // Use the authenticated agent to test the callback
    const response = await agent
      .get('/api/auth/google/callback')
      .query({ 
        code: 'valid-code',
        profile: JSON.stringify(mockProfile)
      });

    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/');

    // Wait for session to be updated
    await sleep(500);

    // Verify session is still valid with retries
    let verifyResponse;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      verifyResponse = await agent.get('/api/auth/verify');
      console.log('Session verification response:', verifyResponse.body);
      
      if (verifyResponse.status === 200 && verifyResponse.body.authenticated) {
        break;
      }

      retries++;
      if (retries < maxRetries) {
        await sleep(500);
      }
    }

    expect(verifyResponse?.status).toBe(200);
    expect(verifyResponse?.body.authenticated).toBe(true);
    expect(verifyResponse?.body.user?.id).toBe(testUser.id);
  });

  it('should return success when authenticated', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user?.id).toBe(testUser.id);
  });

  it('should return 401 when not authenticated', async () => {
    // Create a new unauthenticated agent
    const unauthAgent = request(app);
    const response = await unauthAgent.get('/api/auth/verify');
    expect(response.status).toBe(401);
    expect(response.body.authenticated).toBe(false);
  });
}); 