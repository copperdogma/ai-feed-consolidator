import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import { DatabaseStateManager } from '../../tests/utils/setup-test-db';
import { TestDataFactory } from '../../tests/utils/factories';
import request from 'supertest';
import type { Express, Request, Response } from 'express';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { configureSession } from '../auth/session';
import { configurePassport } from '../auth/passport';
import { configureGoogleStrategy } from '../auth/google-strategy';
import { requireAuth, addRequestInfo } from '../auth/middleware';
import { ServiceContainer } from '../services/service-container';
import { LoginHistoryService } from '../services/login-history';
import { UserService } from '../services/user-service';
import { TransactionManager } from '../services/transaction-manager';
import type { User } from '../../types/user';
import { logger } from '../logger';
import '../../tests/utils/test-hooks';
import { registerStandardServices, ServiceRegistrationType } from '../../tests/utils/register-standard-services';
import type { IDatabase } from 'pg-promise';

// Helper function to ensure string values
function ensureString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return defaultValue;
}

describe.sequential('Auth History', () => {
  let pool: IDatabase<any>;
  let app: Express;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;
  let factory: TestDataFactory;
  let testUser: User;
  let loginHistoryService: LoginHistoryService;

  beforeAll(async () => {
    try {
      logger.info('Starting Auth History test setup');
      
      // Get existing instances (don't shut down the global one)
      dbManager = DatabaseStateManager.getInstance();
      
      // Make sure DB is initialized
      try {
        logger.info('Ensuring database is initialized');
        await dbManager.initialize();
        logger.info('Database is initialized');
      } catch (err) {
        logger.error('Error initializing database:', err);
        throw err;
      }
      
      // Get database pool
      try {
        logger.info('Getting database pool');
        pool = dbManager.getPool();
        logger.info('Successfully got database pool');
      } catch (err) {
        logger.error('Error getting database pool:', err);
        throw err;
      }
      
      // Reset and initialize service container
      logger.info('Setting up service container');
      ServiceContainer.resetInstance();
      container = ServiceContainer.getInstance();
      container.register('pool', pool);
      container.register('databasePool', pool);
      
      // Initialize container
      logger.info('Initializing container');
      await container.initialize();
      
      // Register standard services
      logger.info('Registering standard services');
      await registerStandardServices(container, pool, ServiceRegistrationType.AUTH, {
        verbose: true
      });
      
      // Initialize test data factory
      logger.info('Initializing test data factory');
      factory = TestDataFactory.getInstance();
      await factory.initialize(pool);
      
      // Get the login history service
      loginHistoryService = container.getService<LoginHistoryService>('loginHistoryService');
      
      // Create Express app with new auth modules
      app = express();
      
      // Configure session and auth
      app.use(express.json());
      app.use(configureSession());
      app.use(passport.initialize());
      app.use(passport.session());
      
      // Configure passport after service container is initialized
      configurePassport();
      configureGoogleStrategy();
      
      // Add auth middleware
      app.use(addRequestInfo);

      // Add test routes
      app.post('/test/login', async (req, res) => {
        try {
          const userAgent = req.get('User-Agent') ?? '';
          const rawIp = req.get('X-Forwarded-For') ?? req.ip ?? '127.0.0.1';
          // Convert IPv4 to IPv6 format if needed
          const ipAddress = rawIp.includes(':') ? rawIp : `::ffff:${rawIp}`;
          
          // Verify user exists before recording login
          const userCheck = await pool.oneOrNone('SELECT id FROM users WHERE id = $1', [testUser.id]);
          if (!userCheck) {
            throw new Error(`User ${testUser.id} does not exist`);
          }
          
          await loginHistoryService.recordLogin(testUser.id, ipAddress, userAgent);
          res.json({ success: true });
        } catch (error) {
          logger.error('Error in /test/login route:', error);
          res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      app.get('/test/history', async (req: Request, res: Response) => {
        try {
          const history = await loginHistoryService.getLoginHistory(testUser.id);
          res.json(history);
        } catch (error) {
          logger.error('Error getting login history:', error);
          res.status(500).json({ 
            error: 'Failed to get login history',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      logger.info('Auth History test setup completed successfully');
    } catch (error) {
      logger.error('Error in Auth History test setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      logger.info('Starting Auth History test cleanup');
      
      // Only clear the container, don't shut down the database manager
      if (container) {
        await container.clear();
      }
      
      // Reset test data factory, but don't destroy connections
      if (factory) {
        factory.reset();
      }
      
      logger.info('Auth History test cleanup completed successfully');
    } catch (error) {
      logger.error('Error in Auth History test cleanup:', error);
    }
  });

  beforeEach(async () => {
    try {
      logger.info('Auth History test beforeEach - cleaning database');
      
      // Clean database before each test
      if (dbManager) {
        await dbManager.cleanDatabase();
      }
      
      // Create test user with precise timestamp to ensure uniqueness
      const timestamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      testUser = await factory.createUser({
        email: `auth-history-test-${timestamp}@example.com`,
        google_id: `google-auth-history-${timestamp}`,
        display_name: `Test User ${timestamp}`
      });

      // Verify user was created
      const verifyUser = await pool.oneOrNone('SELECT * FROM users WHERE id = $1', [testUser.id]);
      if (!verifyUser) {
        throw new Error('Failed to verify user creation');
      }
      
      logger.info('Auth History test beforeEach completed');
    } catch (error) {
      logger.error('Error in Auth History test beforeEach:', error);
      throw error;
    }
  });

  it('should track successful login', async () => {
    logger.info('Starting test: track successful login');
    
    const response = await request(app)
      .post('/test/login')
      .set('User-Agent', 'test-agent')
      .set('X-Forwarded-For', '127.0.0.1');

    if (response.status === 500) {
      logger.error('Login error:', response.body);
    }

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    // Verify login was recorded
    const history = await loginHistoryService.getLoginHistory(testUser.id);
    expect(history.length).toBe(1);
    expect(history[0].success).toBe(true);
    
    logger.info('Test completed: track successful login');
  });

  it('should track login history with user agent', async () => {
    logger.info('Starting test: track login with user agent');
    
    const userAgent = 'Mozilla/5.0 (Test Browser) AppleWebKit/537.36';
    const response = await request(app)
      .post('/test/login')
      .set('User-Agent', userAgent)
      .set('X-Forwarded-For', '192.168.1.1');

    expect(response.status).toBe(200);
    
    // Verify login details were recorded
    const history = await loginHistoryService.getLoginHistory(testUser.id);
    expect(history.length).toBe(1);
    expect(history[0].user_agent).toBe(userAgent);
    expect(history[0].ip_address).toBe('::ffff:192.168.1.1');
    
    logger.info('Test completed: track login with user agent');
  });
}); 