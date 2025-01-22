import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentProcessor, ContentProcessingError } from '../content-processor';
import { OpenAIService } from '../openai';
import { FeedItem } from '../../types/feed';

// Mock OpenAI service
vi.mock('../openai', () => ({
  OpenAIService: vi.fn().mockImplementation(() => ({
    extractCorePoints: vi.fn().mockResolvedValue([
      'Key point 1',
      'Key point 2'
    ])
  }))
}));

describe('ContentProcessor', () => {
  let contentProcessor: ContentProcessor;
  let openai: OpenAIService;

  beforeEach(() => {
    openai = new OpenAIService();
    contentProcessor = new ContentProcessor(openai);
  });

  describe('processFeedItem', () => {
    it('should process item with full content', async () => {
      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: 'Test Article',
        content: 'This is the main content of the article.',
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      const result = await contentProcessor.processFeedItem(item);

      expect(result.keyPoints).toHaveLength(2);
      expect(result.readingTimeMinutes).toBeGreaterThan(0);
      expect(openai.extractCorePoints).toHaveBeenCalledWith(item.content);
    });

    it('should fall back to summary when content is empty', async () => {
      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: 'Test Article',
        content: '', // Empty content
        summary: 'This is the article summary.',
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      const result = await contentProcessor.processFeedItem(item);

      expect(result.keyPoints).toHaveLength(2);
      expect(openai.extractCorePoints).toHaveBeenCalledWith(item.summary);
    });

    it('should fall back to title when content is empty and no summary', async () => {
      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: 'Test Article',
        content: '', // Empty content
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      const result = await contentProcessor.processFeedItem(item);

      expect(result.keyPoints).toHaveLength(2);
      expect(openai.extractCorePoints).toHaveBeenCalledWith(item.title);
    });

    it('should throw error when no content is available', async () => {
      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: '', // Empty title
        content: '', // Empty content
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      await expect(contentProcessor.processFeedItem(item))
        .rejects
        .toThrow(ContentProcessingError);
    });

    it('should clean HTML content', async () => {
      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: 'Test Article',
        content: '<p>This is <b>formatted</b> content.</p>',
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      const result = await contentProcessor.processFeedItem(item);

      expect(openai.extractCorePoints).toHaveBeenCalledWith('This is formatted content.');
    });

    it('should handle OpenAI errors gracefully', async () => {
      vi.mocked(openai.extractCorePoints).mockRejectedValueOnce(new Error('OpenAI error'));

      const item: FeedItem = {
        id: '1',
        sourceId: 'test',
        externalId: 'ext1',
        url: 'https://example.com',
        title: 'Test Article',
        content: 'Test content',
        publishedAt: new Date(),
        source: {
          id: 'src1',
          name: 'Test Source',
          url: 'https://example.com',
          platform: 'test'
        }
      };

      await expect(contentProcessor.processFeedItem(item))
        .rejects
        .toThrow(ContentProcessingError);
    });
  });
}); 