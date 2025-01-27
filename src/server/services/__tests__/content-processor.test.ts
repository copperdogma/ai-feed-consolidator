import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentProcessor, ContentProcessingError } from '../content-processor';
import { OpenAIService, SummaryResponse } from '../openai';
import { FeedItem } from '../../types/feed';

describe('ContentProcessor', () => {
  let processor: ContentProcessor;
  let mockOpenAI: { createSummary: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockOpenAI = {
      createSummary: vi.fn(),
    };
    processor = new ContentProcessor(mockOpenAI as unknown as OpenAIService);
  });

  it('should process feed item with content', async () => {
    const mockFeedItem: FeedItem = {
      id: '1',
      sourceId: 'source1',
      externalId: 'ext1',
      title: 'Test Article',
      content: 'Test content',
      summary: '',
      url: 'https://example.com',
      publishedAt: new Date(),
      source: {
        id: 'source1',
        name: 'Test Source',
        platform: 'test',
        url: 'https://example.com'
      },
      media: [],
      topics: []
    };

    const mockSummary: SummaryResponse = {
      summary: 'Summarized content',
      content_type: 'news',
      time_sensitive: false,
      requires_background: [],
      consumption_time: {
        minutes: 5,
        type: 'read'
      }
    };

    mockOpenAI.createSummary.mockResolvedValueOnce(mockSummary);

    const result = await processor.processFeedItem(mockFeedItem);

    expect(result).toEqual({
      ...mockFeedItem,
      ...mockSummary,
      processedAt: expect.any(Date)
    });
  });

  it('should throw error if no content is available', async () => {
    const mockFeedItem: FeedItem = {
      id: '1',
      sourceId: 'source1',
      externalId: 'ext1',
      title: '',
      content: '',
      summary: '',
      url: 'https://example.com',
      publishedAt: new Date(),
      source: {
        id: 'source1',
        name: 'Test Source',
        platform: 'test',
        url: 'https://example.com'
      },
      media: [],
      topics: []
    };

    await expect(processor.processFeedItem(mockFeedItem)).rejects.toThrow(
      new ContentProcessingError('No content available for processing')
    );
  });

  it('should handle OpenAI errors gracefully', async () => {
    const mockFeedItem: FeedItem = {
      id: '1',
      sourceId: 'source1',
      externalId: 'ext1',
      title: 'Test Article',
      content: 'Test content',
      summary: '',
      url: 'https://example.com',
      publishedAt: new Date(),
      source: {
        id: 'source1',
        name: 'Test Source',
        platform: 'test',
        url: 'https://example.com'
      },
      media: [],
      topics: []
    };

    mockOpenAI.createSummary.mockRejectedValueOnce(new Error('OpenAI API error'));

    await expect(processor.processFeedItem(mockFeedItem)).rejects.toThrowError(ContentProcessingError);
  });
}); 