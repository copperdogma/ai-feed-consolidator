import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { FeedPollingService } from '../../services/rss/feed-polling-service';
import { RSSFetchError } from '../../services/rss/rss-fetcher';
import { ErrorCategory, FeedHealthUpdate } from '../../../types/feed-health';
import { RSSFeedConfig } from '../../services/rss/feed-repository';
import { ServiceContainer } from '../../services/service-container';
import { DatabaseStateManager } from '../../../tests/utils/database-state-manager';
import { logger } from '../../logger';
import '../../../tests/utils/test-hooks';

// Create mock repositories
const mockFeedRepository = {
  getFeedsDueForUpdate: vi.fn(),
  updateFeedMetadata: vi.fn(),
  updateFeedHealth: vi.fn(),
  saveFeedItems: vi.fn()
};

const mockRSSParser = {
  parseFeed: vi.fn()
};

describe('FeedPollingService', () => {
  let feedPollingService: FeedPollingService;
  let container: ServiceContainer;
  let dbManager: DatabaseStateManager;

  beforeEach(async () => {
    try {
      // Reset all mocks
      vi.clearAllMocks();

      // Initialize database manager
      dbManager = DatabaseStateManager.getInstance();
      await dbManager.initialize();

      // Initialize container with mocks
      container = ServiceContainer.getInstance();
      await container.initialize();

      // Register services in dependency order
      container.registerFactory('pool', () => dbManager.getPool());
      container.registerFactory('feedRepository', () => mockFeedRepository);
      container.registerFactory('rssParser', () => mockRSSParser);

      // Initialize service
      feedPollingService = new FeedPollingService(container);
    } catch (error) {
      logger.error('Error in beforeEach:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await dbManager.cleanDatabase();
      await container.clear();
    } catch (error) {
      logger.error('Error in afterEach:', error);
      throw error;
    }
  });

  it('should update feed metadata and items on successful fetch', async () => {
    const feedConfig: RSSFeedConfig = {
      id: 1,
      userId: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'Test Feed',
      description: '',
      siteUrl: '',
      iconUrl: '',
      lastFetchedAt: new Date(),
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockFeedInfo = {
      title: 'Updated Feed Title',
      description: 'Feed Description',
      url: 'https://example.com',
      items: [
        {
          guid: '1',
          title: 'Item 1',
          url: 'https://example.com/1',
          description: 'Description 1',
          pubDate: new Date().toISOString()
        }
      ]
    };

    mockFeedRepository.getFeedsDueForUpdate.mockResolvedValue([feedConfig]);
    mockRSSParser.parseFeed.mockResolvedValue(mockFeedInfo);

    await feedPollingService.updateFeeds();

    expect(mockFeedRepository.updateFeedMetadata).toHaveBeenCalledWith(feedConfig.id, {
      title: mockFeedInfo.title,
      description: mockFeedInfo.description,
      url: mockFeedInfo.url
    });

    expect(mockFeedRepository.saveFeedItems).toHaveBeenCalled();
    expect(mockFeedRepository.updateFeedHealth).toHaveBeenCalledWith(feedConfig.id, {
      errorCount: 0,
      lastError: '',
      errorCategory: 'UNKNOWN_ERROR',
      isPermanentlyInvalid: false
    });
  });

  it('should handle invalid XML error', async () => {
    const feedConfig: RSSFeedConfig = {
      id: 1,
      userId: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'Test Feed',
      description: '',
      siteUrl: '',
      iconUrl: '',
      lastFetchedAt: new Date(),
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFeedRepository.getFeedsDueForUpdate.mockResolvedValue([feedConfig]);
    mockRSSParser.parseFeed.mockRejectedValue(new RSSFetchError({
      message: 'Invalid XML',
      errorCategory: 'PARSE_ERROR',
      isPermanentlyInvalid: false
    }));

    await feedPollingService.updateFeeds();

    expect(mockFeedRepository.updateFeedHealth).toHaveBeenCalledWith(feedConfig.id, {
      errorCount: 1,
      lastError: 'Invalid XML',
      errorCategory: 'PARSE_ERROR',
      isPermanentlyInvalid: false
    });
  });

  it('should handle network error', async () => {
    const feedConfig: RSSFeedConfig = {
      id: 1,
      userId: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'Test Feed',
      description: '',
      siteUrl: '',
      iconUrl: '',
      lastFetchedAt: new Date(),
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFeedRepository.getFeedsDueForUpdate.mockResolvedValue([feedConfig]);
    mockRSSParser.parseFeed.mockRejectedValue(new RSSFetchError({
      message: 'Network error',
      errorCategory: 'NETWORK_ERROR',
      isPermanentlyInvalid: false,
      isTransient: true
    }));

    await feedPollingService.updateFeeds();

    expect(mockFeedRepository.updateFeedHealth).toHaveBeenCalledWith(feedConfig.id, {
      errorCount: 1,
      lastError: 'Network error',
      errorCategory: 'NETWORK_ERROR',
      isPermanentlyInvalid: false
    });
  });

  it('should handle timeout error', async () => {
    const feedConfig: RSSFeedConfig = {
      id: 1,
      userId: 1,
      feedUrl: 'https://example.com/feed.xml',
      title: 'Test Feed',
      description: '',
      siteUrl: '',
      iconUrl: '',
      lastFetchedAt: new Date(),
      errorCount: 0,
      isActive: true,
      fetchIntervalMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFeedRepository.getFeedsDueForUpdate.mockResolvedValue([feedConfig]);
    mockRSSParser.parseFeed.mockRejectedValue(new RSSFetchError({
      message: 'Request timed out',
      errorCategory: 'TIMEOUT',
      isPermanentlyInvalid: false,
      isTransient: true
    }));

    await feedPollingService.updateFeeds();

    expect(mockFeedRepository.updateFeedHealth).toHaveBeenCalledWith(feedConfig.id, {
      errorCount: 1,
      lastError: 'Request timed out',
      errorCategory: 'TIMEOUT',
      isPermanentlyInvalid: false
    });
  });
}); 