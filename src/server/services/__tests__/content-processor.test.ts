import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentProcessor, ContentProcessingError } from '../content-processor';
import { OpenAIService, SummaryResponse } from '../openai';
import { FeedItem } from '../../types/feed';

describe('ContentProcessor', () => {
  const mockOpenAI = {
    createSummary: vi.fn()
  };

  const processor = new ContentProcessor(vi.mocked(mockOpenAI) as unknown as OpenAIService);

  const mockFeedItem: FeedItem = {
    id: '1',
    sourceId: 'source1',
    externalId: 'ext1',
    url: 'https://example.com',
    title: 'Test Article',
    content: 'This is a test article with some content.',
    publishedAt: new Date(),
    source: {
      id: 'source1',
      name: 'Test Source',
      url: 'https://example.com',
      platform: 'test'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-23T05:45:29.057Z'));
  });

  it('should process a feed item with content', async () => {
    const summaryResponse: SummaryResponse = {
      summary: 'A concise test article summary.',
      content_type: 'technical',
      time_sensitive: false,
      requires_background: [],
      consumption_time: {
        minutes: 2,
        type: 'read'
      }
    };

    mockOpenAI.createSummary.mockResolvedValueOnce(summaryResponse);

    const result = await processor.processFeedItem(mockFeedItem);

    expect(result).toEqual({
      ...mockFeedItem,
      ...summaryResponse,
      processedAt: new Date('2025-01-23T05:45:29.057Z')
    });

    expect(mockOpenAI.createSummary).toHaveBeenCalledWith(
      'This is a test article with some content.'
    );
  });

  it('should process a feed item with YouTube content', async () => {
    const youtubeItem: FeedItem = {
      ...mockFeedItem,
      metadata: {
        youtube: {
          duration: 'PT15M30S'
        }
      }
    };

    const summaryResponse: SummaryResponse = {
      summary: 'A summary of the video content.',
      content_type: 'entertainment',
      time_sensitive: false,
      requires_background: ['Some context needed'],
      consumption_time: {
        minutes: 16,
        type: 'watch'
      }
    };

    mockOpenAI.createSummary.mockResolvedValueOnce(summaryResponse);

    const result = await processor.processFeedItem(youtubeItem);

    expect(result).toEqual({
      ...youtubeItem,
      ...summaryResponse,
      processedAt: new Date('2025-01-23T05:45:29.057Z')
    });
  });

  it('should fall back to summary if content is not available', async () => {
    const itemWithoutContent: FeedItem = {
      ...mockFeedItem,
      content: '',
      summary: 'A brief summary of the content.'
    };

    const summaryResponse: SummaryResponse = {
      summary: 'Processed summary.',
      content_type: 'news',
      time_sensitive: true,
      requires_background: [],
      consumption_time: {
        minutes: 1,
        type: 'read'
      }
    };

    mockOpenAI.createSummary.mockResolvedValueOnce(summaryResponse);

    const result = await processor.processFeedItem(itemWithoutContent);

    expect(result).toEqual({
      ...itemWithoutContent,
      ...summaryResponse,
      processedAt: new Date('2025-01-23T05:45:29.057Z')
    });
    expect(mockOpenAI.createSummary).toHaveBeenCalledWith('A brief summary of the content.');
  });

  it('should throw error if no content is available', async () => {
    const emptyItem: FeedItem = {
      id: 'test-id',
      sourceId: 'test-source-id',
      externalId: 'test-external-id',
      url: 'https://example.com',
      title: '',
      content: '',
      summary: '',
      publishedAt: new Date(),
      source: {
        id: 'test-source',
        name: 'Test Source',
        url: 'https://example.com',
        platform: 'feedly'
      }
    };

    await expect(processor.processFeedItem(emptyItem)).rejects.toThrow(
      new ContentProcessingError('No content available for processing')
    );
  });

  it('should handle OpenAI errors gracefully', async () => {
    mockOpenAI.createSummary.mockRejectedValueOnce(new Error('OpenAI API error'));

    await expect(processor.processFeedItem(mockFeedItem)).rejects.toThrow(
      new ContentProcessingError('Failed to process feed item')
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}); 