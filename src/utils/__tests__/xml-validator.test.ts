import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XmlValidator } from '../xml-validator';
import { FeedValidationResult } from '../../types/feed-validation';
import { FeedInfo } from '../../types/feed-types';

// Mock xml-utils module
vi.mock('../xml-utils');

// Import after mock setup
import { parseFeedXml } from '../xml-utils';

describe('XmlValidator', () => {
  let validator: XmlValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new XmlValidator();
  });

  describe('validateXml', () => {
    it('should return error for empty content', async () => {
      const result = await validator.validateXml('', 'http://example.com/feed.xml');

      expect(result).toEqual({
        url: 'http://example.com/feed.xml',
        isValid: false,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: 'Empty feed content',
        statusCode: 200,
        feedInfo: undefined,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
      expect(parseFeedXml).not.toHaveBeenCalled();
    });

    it('should return error for parse failures', async () => {
      vi.mocked(parseFeedXml).mockRejectedValueOnce(new Error('Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: i'));

      const result = await validator.validateXml('invalid xml', 'http://example.com/feed.xml');

      expect(result).toEqual({
        url: 'http://example.com/feed.xml',
        isValid: false,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: 'Invalid XML',
        statusCode: 200,
        feedInfo: undefined,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
      expect(parseFeedXml).toHaveBeenCalledWith('invalid xml');
    });

    it('should return error for missing required elements', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <!-- Missing title and items -->
          </channel>
        </rss>
      `;

      vi.mocked(parseFeedXml).mockResolvedValueOnce({
        description: 'Test description'
      } as FeedInfo);

      const result = await validator.validateXml(xml, 'http://example.com/feed.xml');

      expect(result).toEqual({
        url: 'http://example.com/feed.xml',
        isValid: false,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: 'Missing required elements: title',
        statusCode: 200,
        feedInfo: {
          description: 'Test description'
        },
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
      expect(parseFeedXml).toHaveBeenCalledWith(xml);
    });

    it('should validate valid feed content', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Test Description</description>
            <link>http://example.com</link>
            <item>
              <title>Test Item</title>
              <description>Test Item Description</description>
              <link>http://example.com/item1</link>
              <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `;

      vi.mocked(parseFeedXml).mockResolvedValueOnce({
        title: 'Test Feed',
        description: 'Test Description',
        url: 'http://example.com',
        items: [{
          title: 'Test Item',
          description: 'Test Item Description',
          url: 'http://example.com/item1',
          pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT'
        }]
      } as FeedInfo);

      const result = await validator.validateXml(xml, 'http://example.com/feed.xml');

      expect(result).toEqual({
        url: 'http://example.com/feed.xml',
        isValid: true,
        errorCategory: undefined,
        errorDetail: undefined,
        statusCode: 200,
        feedInfo: {
          title: 'Test Feed',
          description: 'Test Description',
          url: 'http://example.com',
          items: [{
            title: 'Test Item',
            description: 'Test Item Description',
            url: 'http://example.com/item1',
            pubDate: 'Mon, 01 Jan 2024 00:00:00 GMT'
          }]
        },
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
      expect(parseFeedXml).toHaveBeenCalledWith(xml);
    });

    it('should validate feed with minimal required fields', async () => {
      const xml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
          </channel>
        </rss>
      `;

      vi.mocked(parseFeedXml).mockResolvedValueOnce({
        title: 'Test Feed',
        description: ''
      } as FeedInfo);

      const result = await validator.validateXml(xml, 'http://example.com/feed.xml');

      expect(result).toEqual({
        url: 'http://example.com/feed.xml',
        isValid: true,
        errorCategory: undefined,
        errorDetail: undefined,
        statusCode: 200,
        feedInfo: {
          title: 'Test Feed',
          description: ''
        },
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
      expect(parseFeedXml).toHaveBeenCalledWith(xml);
    });
  });
}); 