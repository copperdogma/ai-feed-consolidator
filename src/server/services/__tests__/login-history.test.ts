import { describe, it, expect, beforeEach, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { LoginHistoryService } from '../login-history';
import { DatabaseStateManager } from '../../../tests/utils/setup-test-db';
import { TestDataFactory } from '../../../tests/utils/factories';
import { ServiceContainer } from '../service-container';
import { randomUUID } from 'crypto';
import { logger } from '../../logger';
import { registerStandardServices, ServiceRegistrationType } from '../../../tests/utils/register-standard-services';

// Force detailed logging
vi.mock('../../logger', () => {
  return {
    logger: {
      info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
    }
  };
});

// Run tests in sequence, not in parallel
describe.sequential('LoginHistoryService', () => {
  let loginHistoryService: LoginHistoryService;
  let testUserId: number;
  let container: ServiceContainer;
  let testDataFactory: TestDataFactory;
  let dbManager: DatabaseStateManager;
  let pool: any;
  const testSuiteId = `login-history-test-${randomUUID()}`;

  // Increase the timeout for this test suite
  vi.setConfig({ testTimeout: 120000 });

  // Set up once before all tests
  beforeAll(async () => {
    try {
      logger.info('[SETUP] Starting test setup');
      
      // Get database state manager
      dbManager = DatabaseStateManager.getInstance();
      
      // Initialize the database explicitly
      await dbManager.initialize();
      
      // Register this test suite
      await dbManager.registerTestSuite(testSuiteId);
      logger.info('[SETUP] Test suite registered');
      
      // Acquire an initial connection to verify database is working
      pool = await dbManager.acquireConnection(testSuiteId);
      
      if (!pool) {
        throw new Error('Failed to acquire database connection');
      }
      
      logger.info('[SETUP] Initial database connection verified');
      logger.info('[SETUP] Test setup completed successfully');
    } catch (error) {
      logger.error('[SETUP] Error in test setup:', error);
      throw error;
    }
  });

  // Clean up once after all tests
  afterAll(async () => {
    try {
      logger.info('[CLEANUP] Starting test cleanup');
      
      // Release the connection and unregister test suite
      if (dbManager) {
        if (pool) {
          await dbManager.releaseConnection(testSuiteId);
          logger.info('[CLEANUP] Database connection released');
        }
        
        await dbManager.unregisterTestSuite(testSuiteId);
        logger.info('[CLEANUP] Test suite unregistered');
      }
      
      logger.info('[CLEANUP] Test cleanup completed successfully');
    } catch (error) {
      logger.error('[CLEANUP] Error in test cleanup:', error);
    }
  });

  // Before each individual test
  beforeEach(async () => {
    try {
      logger.info('[BEFORE-EACH] Starting test preparation');
      
      // Acquire a connection for this test
      pool = await dbManager.acquireConnection(testSuiteId);
      
      // Clean database before each test
      try {
        await dbManager.cleanDatabase();
        logger.info('[BEFORE-EACH] Database cleaned successfully');
      } catch (error) {
        logger.warn('[BEFORE-EACH] Clean database warning:', error);
      }
      
      // Initialize service container
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      
      // Register the pool with the container
      container.register('databasePool', pool);
      
      // Initialize container
      await container.initialize();
      
      // Register standard services, specifically the ones needed for user and login history
      await registerStandardServices(container, pool, ServiceRegistrationType.USER, {
        verbose: true
      });
      
      // Get login history service from container
      loginHistoryService = container.getService<any>('loginHistoryService');
      
      // Initialize test data factory
      testDataFactory = TestDataFactory.getInstance();
      await testDataFactory.initialize(pool);
      
      // Create test user with precise timestamp to ensure uniqueness
      const timestamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const user = await testDataFactory.createUser({
        email: `login-history-test-${timestamp}@example.com`,
        google_id: `google-login-history-${timestamp}`,
        display_name: `Test User ${timestamp}`
      });
      testUserId = user.id;
      
      logger.info('[BEFORE-EACH] Test preparation completed, user ID:', testUserId);
    } catch (error) {
      logger.error('[BEFORE-EACH] Error in test preparation:', error);
      throw error;
    }
  });
  
  // After each individual test
  afterEach(async () => {
    try {
      logger.info('[AFTER-EACH] Starting test cleanup');
      
      // Reset test data and clear service container
      if (testDataFactory) {
        await testDataFactory.reset();
        logger.info('[AFTER-EACH] Test data factory reset');
      }
      
      if (container) {
        await container.clear();
        logger.info('[AFTER-EACH] Service container cleared');
      }
      
      logger.info('[AFTER-EACH] Test cleanup completed');
    } catch (error) {
      logger.error('[AFTER-EACH] Error in test cleanup:', error);
    }
  });

  // First test - Record successful login
  it('should record successful login attempt', async () => {
    try {
      logger.info('[TEST-1] Starting test: record login attempt');
      
      // Verify service exists
      expect(loginHistoryService).toBeDefined();
      
      // Record a successful login
      await loginHistoryService.recordLogin(
        testUserId,
        '127.0.0.1',
        'test-agent',
        true
      );
      
      logger.info('[TEST-1] Login recorded successfully');
      
      // Get the database pool from the container
      const dbPool = container.getService<any>('databasePool');
      
      // Verify it was recorded
      const result = await dbPool.oneOrNone(
        'SELECT COUNT(*) FROM login_history WHERE user_id = $1 AND success = true',
        [testUserId]
      );
      
      expect(parseInt(result.count)).toBe(1);
      logger.info('[TEST-1] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-1] Error in login recording test:', error);
      throw error;
    }
  });

  // Second test - Count failed login attempts
  it('should count recent failed login attempts', async () => {
    try {
      logger.info('[TEST-2] Starting test: count failed login attempts');
      
      // Verify service exists
      expect(loginHistoryService).toBeDefined();
      
      // Record three failed login attempts
      for (let i = 1; i <= 3; i++) {
        try {
          await loginHistoryService.recordLogin(
            testUserId,
            `127.0.0.${i}`,
            'test-agent',
            false,
            `Invalid password ${i}`
          );
          logger.info(`[TEST-2] Failed login ${i} recorded successfully`);
        } catch (error) {
          logger.error(`[TEST-2] Error recording failed login ${i}:`, error);
          throw error;
        }
      }
      
      // Get the database pool from the container
      const dbPool = container.getService<any>('databasePool');
      
      // Verify failed attempts
      const countResult = await dbPool.oneOrNone(
        'SELECT COUNT(*) FROM login_history WHERE user_id = $1 AND success = false',
        [testUserId]
      );
      
      expect(parseInt(countResult.count)).toBe(3);
      
      // Now test the service method to get login history
      const loginHistory = await loginHistoryService.getLoginHistory(testUserId);
      const failedLogins = loginHistory.filter(entry => !entry.success);
      
      expect(failedLogins.length).toBe(3);
      logger.info('[TEST-2] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-2] Error in failed login count test:', error);
      throw error;
    }
  });

  // Third test - Record failed login attempt without a user ID
  it('should record failed login attempt without a user ID', async () => {
    try {
      logger.info('[TEST-3] Starting test: record failed login without user ID');
      
      // Verify service exists
      expect(loginHistoryService).toBeDefined();

      // Test IP and request details
      const testIp = '192.168.1.1';
      const testUserAgent = 'test-browser-agent';
      const testFailureReason = 'Invalid email address';
      const testRequestPath = '/api/auth/login';
      
      // Record a failed login without a user ID
      await loginHistoryService.recordFailedAttempt(
        testIp,
        testUserAgent,
        testFailureReason,
        testRequestPath
      );
      
      logger.info('[TEST-3] Failed login without user ID recorded successfully');
      
      // Get the database pool from the container
      const dbPool = container.getService<any>('databasePool');
      
      // Verify it was recorded
      const result = await dbPool.oneOrNone(
        'SELECT * FROM login_history WHERE ip_address = $1 AND user_id IS NULL AND success = false',
        [testIp]
      );
      
      expect(result).toBeDefined();
      expect(result.ip_address).toBe(testIp);
      expect(result.user_agent).toBe(testUserAgent);
      expect(result.failure_reason).toBe(testFailureReason);
      expect(result.request_path).toBe(testRequestPath);
      expect(result.success).toBe(false);
      
      logger.info('[TEST-3] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-3] Error in recordFailedAttempt test:', error);
      throw error;
    }
  });

  // Fourth test - Record failed login attempt with a user ID
  it('should record failed login attempt with a user ID', async () => {
    try {
      logger.info('[TEST-4] Starting test: record failed login with user ID');
      
      // Verify service exists
      expect(loginHistoryService).toBeDefined();

      // Test details
      const testIp = '192.168.1.2';
      const testUserAgent = 'test-mobile-agent';
      const testFailureReason = 'Account locked';
      const testRequestPath = '/api/auth/verify';
      
      // Record a failed login with a user ID
      await loginHistoryService.recordFailedAttempt(
        testIp,
        testUserAgent,
        testFailureReason,
        testRequestPath,
        testUserId
      );
      
      logger.info('[TEST-4] Failed login with user ID recorded successfully');
      
      // Get the database pool from the container
      const dbPool = container.getService<any>('databasePool');
      
      // Verify it was recorded
      const result = await dbPool.oneOrNone(
        'SELECT * FROM login_history WHERE ip_address = $1 AND user_id = $2 AND success = false',
        [testIp, testUserId]
      );
      
      expect(result).toBeDefined();
      expect(result.ip_address).toBe(testIp);
      expect(result.user_agent).toBe(testUserAgent);
      expect(result.failure_reason).toBe(testFailureReason);
      expect(result.request_path).toBe(testRequestPath);
      expect(result.user_id).toBe(testUserId);
      expect(result.success).toBe(false);
      
      logger.info('[TEST-4] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-4] Error in recordFailedAttempt with user ID test:', error);
      throw error;
    }
  });
}); 