import { describe, it, expect } from 'vitest';
import { transformFeedItem, transformFeedItems } from '../transformFeed';
import { ProcessedFeedItem } from '../../types/feed';

describe('transformFeedItem', () => {
  const TEST_DATE = '2024-01-01T00:00:00.000Z';
  
  it('should transform a valid feed item with all fields', () => {
    const input = {
      id: '123',
      title: 'Test Article',
      url: 'https://example.com/article',
      content: 'Test content',
      summary: 'Test summary',
      source_id: 'src_123',
      external_id: 'ext_123',
      published_at: TEST_DATE,
      source: {
        id: 'source_1',
        name: 'Test Source',
        platform: 'rss',
        url: 'https://example.com'
      },
      media: [{ 
        type: 'image', 
        url: 'https://example.com/image.jpg',
        width: undefined,
        height: undefined,
        contentType: undefined,
        thumbnailUrl: undefined
      }],
      topics: ['tech', 'news'],
      feed_config_id: 1,
      content_type: 'technical',
      time_sensitive: true,
      requires_background: ['programming'],
      consumption_time: {
        minutes: 10,
        type: 'read'
      },
      processed_at: TEST_DATE
    };

    const expected: ProcessedFeedItem = {
      id: '123',
      title: 'Test Article',
      url: 'https://example.com/article',
      content: 'Test content',
      summary: 'Test summary',
      sourceId: 'src_123',
      externalId: 'ext_123',
      publishedAt: new Date(TEST_DATE),
      source: {
        id: 'source_1',
        name: 'Test Source',
        platform: 'rss',
        url: 'https://example.com'
      },
      media: [{
        type: 'image',
        url: 'https://example.com/image.jpg',
        width: undefined,
        height: undefined,
        contentType: undefined,
        thumbnailUrl: undefined
      }],
      topics: ['tech', 'news'],
      feedConfigId: 1,
      content_type: 'technical',
      time_sensitive: true,
      requires_background: ['programming'],
      consumption_time: {
        minutes: 10,
        type: 'read'
      },
      processedAt: new Date(TEST_DATE),
      metadata: {}
    };

    const result = transformFeedItem(input);
    expect(result).toEqual(expected);
  });

  it('should handle minimal valid feed item with defaults', () => {
    const input = {
      id: '123',
      title: 'Test Article',
      url: 'https://example.com/article'
    };

    const result = transformFeedItem(input);

    expect(result).toMatchObject({
      id: '123',
      title: 'Test Article',
      url: 'https://example.com/article',
      content: '',
      summary: '',
      sourceId: '',
      externalId: '123',
      media: [],
      topics: [],
      content_type: 'news',
      time_sensitive: false,
      requires_background: [],
      consumption_time: {
        minutes: 5,
        type: 'read'
      }
    });
    expect(result.processedAt).toBeInstanceOf(Date);
  });

  it('should throw error for missing required fields', () => {
    const invalidInputs = [
      { title: 'Test', url: 'https://example.com' }, // missing id
      { id: '123', url: 'https://example.com' }, // missing title
      { id: '123', title: 'Test' }, // missing url
    ];

    invalidInputs.forEach(input => {
      expect(() => transformFeedItem(input)).toThrow('Invalid feed item: missing required fields');
    });
  });

  it('should handle null or undefined optional fields', () => {
    const input = {
      id: '123',
      title: 'Test Article',
      url: 'https://example.com/article',
      media: null,
      topics: undefined,
      source: null
    };

    const result = transformFeedItem(input);

    expect(result.media).toEqual([]);
    expect(result.topics).toEqual([]);
    expect(result.source).toEqual({
      id: '',
      name: 'Unknown Source',
      platform: 'rss',
      url: ''
    });
  });
});

describe('transformFeedItems', () => {
  it('should transform an array of feed items', () => {
    const input = [
      {
        id: '1',
        title: 'Article 1',
        url: 'https://example.com/1'
      },
      {
        id: '2',
        title: 'Article 2',
        url: 'https://example.com/2'
      }
    ];

    const result = transformFeedItems(input);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('should handle empty array', () => {
    expect(transformFeedItems([])).toEqual([]);
  });

  it('should throw error for invalid items in array', () => {
    const input = [
      { id: '1', title: 'Valid', url: 'https://example.com' },
      { title: 'Invalid' } // missing id and url
    ];

    expect(() => transformFeedItems(input)).toThrow('Invalid feed item: missing required fields');
  });
}); 
