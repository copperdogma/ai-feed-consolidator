import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeedPoller } from '../poll-feeds';
import { getServiceContainer } from '../../services/service-container';
import { logger } from '../../logger';
import { Pool } from 'pg';

// Mock dependencies
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/service-container', () => ({
  getServiceContainer: vi.fn(),
}));

describe('FeedPoller', () => {
  let feedPoller: FeedPoller;
  let mockPool: any;
  let mockRssService: any;
  let mockContainer: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock pool
    mockPool = {
      query: vi.fn(),
    };
    
    // Mock RSS service
    mockRssService = {
      updateFeeds: vi.fn(),
    };
    
    // Mock container
    mockContainer = {
      getService: vi.fn((serviceName) => {
        if (serviceName === 'pool') {
          return mockPool;
        }
        if (serviceName === 'rssService') {
          return mockRssService;
        }
        return null;
      }),
    };
    
    // Mock getServiceContainer
    (getServiceContainer as any).mockReturnValue(mockContainer);
    
    // Create instance
    feedPoller = new FeedPoller();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('checkIfFeedsExist', () => {
    it('should return true when feeds exist', async () => {
      // Mock query result with PostgreSQL's column name format
      mockPool.query.mockResolvedValue({
        rows: [{ 'count': '5' }],
      });
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify query was called correctly
      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM feed_configs LIMIT 1');
    });
    
    it('should return false when no feeds exist', async () => {
      // Mock query result with PostgreSQL's column name format
      mockPool.query.mockResolvedValue({
        rows: [{ 'count': '0' }],
      });
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify query was called correctly
      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM feed_configs LIMIT 1');
    });
    
    it('should handle different PostgreSQL column name formats', async () => {
      // Mock query result with a different column name format
      mockPool.query.mockResolvedValue({
        rows: [{ 'count(*)': '5' }],
      });
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify query was called correctly
      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM feed_configs LIMIT 1');
    });
    
    it('should return false and log error when query fails', async () => {
      // Mock error
      const mockError = new Error('Database error');
      
      // Mock query failure
      mockPool.query.mockRejectedValue(mockError);
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify error was logged with detailed information
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database error',
            name: 'Error',
            stack: expect.any(String)
          })
        }),
        'Error checking if feeds exist'
      );
    });
    
    it('should handle empty result from database', async () => {
      // Mock empty result
      mockPool.query.mockResolvedValue({
        rows: [],
      });
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify info log was called
      expect(logger.info).toHaveBeenCalledWith('No result returned from feed count query');
      
      // Verify query was called correctly
      expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM feed_configs LIMIT 1');
    });
    
    it('should handle missing pool', async () => {
      // Mock missing pool
      mockContainer.getService.mockReturnValue(null);
      
      // Access private method using type assertion
      const result = await (feedPoller as any).checkIfFeedsExist();
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith('Database pool not available');
    });
  });
}); 