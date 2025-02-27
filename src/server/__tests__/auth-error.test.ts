import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { User } from '../../types/user';
import { ServiceContainer } from '../services/service-container';
import { LoginHistoryService } from '../services/login-history';
import { TestDataFactory } from '../../tests/utils/test-data-factory';
import { DatabaseStateManager } from '../../tests/utils/setup-test-db';
import { logger } from '../logger';
import { TransactionManager } from '../services/transaction-manager';
import { registerStandardServices, ServiceRegistrationType } from '../../tests/utils/register-standard-services';
import { randomUUID } from 'crypto';

// Force detailed logging
vi.mock('../logger', () => {
  return {
    logger: {
      info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
    }
  };
});

// Set a longer timeout for this test suite
vi.setConfig({ testTimeout: 120000 });

describe('Auth Error Handling', () => {
  let app: express.Application;
  let loginHistoryService: LoginHistoryService;
  let testUser: User;
  let dbManager: DatabaseStateManager;
  let container: ServiceContainer;
  let testDataFactory: TestDataFactory;
  let pool: any;
  const testSuiteId = `auth-error-test-${randomUUID()}`;

  beforeAll(async () => {
    try {
      logger.info('[SETUP] Starting test setup');
      
      // Get database manager instance
      dbManager = DatabaseStateManager.getInstance();
      
      // Initialize the database manager explicitly
      await dbManager.initialize();
      
      // Register our test suite
      await dbManager.registerTestSuite(testSuiteId);
      logger.info('[SETUP] Test suite registered');
      
      // Acquire a connection for this test suite
      pool = await dbManager.acquireConnection(testSuiteId);
      
      if (!pool) {
        throw new Error('Failed to acquire database connection');
      }
      
      logger.info('[SETUP] Database connection acquired');
      
      // Get a fresh service container
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      
      // Register the pool
      container.register('databasePool', pool);
      
      // Initialize container
      await container.initialize();
      
      // Register standard services
      await registerStandardServices(container, pool, ServiceRegistrationType.AUTH, {
        verbose: true
      });
      
      // Initialize test data factory
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);
      
      // Get login history service
      loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');
      
      // Set up test server
      app = express();
      app.use(express.json());

      // Mock authentication middleware
      const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
        const sessionToken = req.headers.cookie?.split('=')[1];
        if (!sessionToken || sessionToken === 'invalid-session-data') {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      };

      // Protected route
      app.get('/api/protected', authMiddleware, (req, res) => {
        res.json({ message: 'Success' });
      });
      
      logger.info('[SETUP] Test setup completed successfully');
    } catch (error) {
      logger.error('[SETUP] Error in test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      logger.info('[CLEANUP] Starting test cleanup');
      
      // Release the database connection and unregister the test suite
      if (dbManager) {
        try {
          await dbManager.releaseConnection(testSuiteId);
          logger.info('[CLEANUP] Database connection released');
        } catch (error) {
          logger.warn('[CLEANUP] Error releasing connection:', error);
        }
        
        try {
          await dbManager.unregisterTestSuite(testSuiteId);
          logger.info('[CLEANUP] Test suite unregistered');
        } catch (error) {
          logger.warn('[CLEANUP] Error unregistering test suite:', error);
        }
      }
      
      // Clear the container
      if (container) {
        try {
          await container.clear();
          logger.info('[CLEANUP] Service container cleared');
        } catch (error) {
          logger.warn('[CLEANUP] Error clearing service container:', error);
        }
      }
      
      logger.info('[CLEANUP] Test cleanup completed successfully');
    } catch (error) {
      logger.error('[CLEANUP] Error in test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      logger.info('[BEFORE-EACH] Starting test preparation');
      
      // Clean database before each test - wrap in try-catch to prevent test failures on cleanup
      try {
        if (dbManager) {
          await dbManager.cleanDatabase();
          logger.info('[BEFORE-EACH] Database cleaned successfully');
        }
      } catch (error) {
        logger.warn('[BEFORE-EACH] Could not clean database:', error);
      }
      
      // Create test user with precise timestamp to ensure uniqueness
      const timestamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Create test user only if the data factory and pool are available
      if (testDataFactory && pool && pool.connected !== false) {
        testUser = await testDataFactory.createUser({
          email: `auth-error-test-${timestamp}@example.com`,
          google_id: `google-auth-error-${timestamp}`,
          display_name: `Test User ${timestamp}`
        });
        logger.info('[BEFORE-EACH] Test user created:', testUser.id);
      } else {
        logger.warn('[BEFORE-EACH] Could not create test user - testDataFactory or pool not available');
      }
      
      logger.info('[BEFORE-EACH] Test preparation completed');
    } catch (error) {
      logger.error('[BEFORE-EACH] Error in test preparation:', error);
      // Don't throw here - let tests handle availability of required resources
    }
  });

  it('should handle unauthorized access to protected route', async () => {
    logger.info('[TEST-1] Starting test: unauthorized access');
    
    const response = await request(app)
      .get('/api/protected')
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
    
    logger.info('[TEST-1] Test completed successfully');
  });

  it('should track failed authentication attempts', async () => {
    logger.info('[TEST-2] Starting test: failed authentication tracking');
    
    try {
      // Verify prerequisites are available
      expect(loginHistoryService).toBeDefined();
      expect(testUser).toBeDefined();
      
      // Verify the pool is still active before proceeding
      if (pool.connected === false) {
        logger.error('[TEST-2] Database pool is not connected - cannot proceed with test');
        throw new Error('Database pool is not connected');
      }
      
      // Record failed login - wrap in try-catch to provide detailed error logging
      try {
        await loginHistoryService.recordLogin(
          testUser.id,
          '127.0.0.1',
          'Test Browser',
          false,
          'Invalid credentials'
        );
        
        logger.info('[TEST-2] Failed login recorded');
      } catch (error) {
        logger.error('[TEST-2] Error recording failed login:', error);
        throw error;
      }

      // Be cautious with direct pool access - use the service if possible
      // If we must use the pool directly, verify it's connected first
      if (pool.connected === false) {
        logger.error('[TEST-2] Database pool is not connected after recording login');
        throw new Error('Database pool disconnected after recording login');
      }
      
      // Get the login history using the service
      const history = await loginHistoryService.getLoginHistory(testUser.id);
      
      // Verify the login history
      expect(history.length).toBe(1);
      expect(history[0].failure_reason).toBe('Invalid credentials');
      expect(history[0].success).toBe(false);
      
      logger.info('[TEST-2] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-2] Error in test:', error);
      throw error;
    }
  });

  it('should handle malformed session data', async () => {
    logger.info('[TEST-3] Starting test: malformed session data');
    
    const response = await request(app)
      .get('/api/protected')
      .set('Cookie', 'connect.sid=invalid-session-data')
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
    
    logger.info('[TEST-3] Test completed successfully');
  });
}); 