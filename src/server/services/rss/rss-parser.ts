import Parser from 'rss-parser';
import { logger } from '../../logger';
import { FeedInfo, ValidationResult } from '../../../types/feed-health';
import { RSSFetchError } from './rss-fetcher';

const PARSE_TIMEOUT = process.env.NODE_ENV === 'test' ? 5000 : 15000; // 5s for tests, 15s for prod

interface ExtendedParser {
  parse(text: string): Promise<Parser.Output<{ [key: string]: any }>>;
  parseURL(url: string): Promise<Parser.Output<{ [key: string]: any }>>;
}

class ExtendedRSSParser implements ExtendedParser {
  private parser: Parser;

  constructor(options?: Parser.ParserOptions<any, any>) {
    this.parser = new Parser(options);
  }

  parse(text: string): Promise<Parser.Output<{ [key: string]: any }>> {
    return this.parser.parseString(text);
  }

  parseURL(url: string): Promise<Parser.Output<{ [key: string]: any }>> {
    return this.parser.parseURL(url);
  }
}

export interface ParserItem extends Parser.Item {
  contentSnippet?: string;
  content?: string;
  description?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
}

export class RSSParser {
  private parser: ExtendedParser;

  constructor() {
    this.parser = new ExtendedRSSParser({
      timeout: PARSE_TIMEOUT,
      customFields: {
        item: ['media:content', 'content:encoded', 'description']
      }
    });
  }

  /**
   * Parse RSS feed content and return feed information
   */
  async parseFeed(content: string): Promise<FeedInfo> {
    try {
      // First try to parse as XML
      if (!content.trim().startsWith('<?xml')) {
        throw new RSSFetchError({
          message: 'Invalid XML: Document does not start with XML declaration',
          errorCategory: 'PARSE_ERROR',
          isTransient: false,
          isPermanentlyInvalid: false
        });
      }

      const feed = await this.parser.parse(content);

      if (!feed.items || feed.items.length === 0) {
        throw new RSSFetchError({
          message: 'Feed contains no items',
          errorCategory: 'PARSE_ERROR',
          isTransient: false,
          isPermanentlyInvalid: false
        });
      }

      return {
        title: feed.title,
        description: feed.description,
        url: feed.link,
        items: feed.items.map((item: ParserItem) => ({
          title: item.title || '',
          description: item.contentSnippet || item.content || item.description || '',
          url: item.link || '',
          guid: item.guid || item.link || '',  // Use link as fallback for guid
          pubDate: item.pubDate || item.isoDate || new Date().toISOString()
        }))
      };
    } catch (error) {
      logger.error({ error }, 'Failed to parse RSS feed content');
      if (error instanceof RSSFetchError) {
        throw error;
      }

      // Handle XML parsing errors
      if (error instanceof Error && (
        error.name === 'ParseError' ||
        error.message.includes('Invalid') ||
        error.message.includes('Failed to parse') ||
        error.message.includes('XML')
      )) {
        throw new RSSFetchError({
          message: 'Invalid XML: Failed to parse feed content',
          errorCategory: 'PARSE_ERROR',
          isTransient: false,
          isPermanentlyInvalid: false,
          originalError: error
        });
      }

      // Handle other parsing errors
      throw new RSSFetchError({
        message: error instanceof Error ? error.message : 'Failed to parse feed content',
        errorCategory: 'PARSE_ERROR',
        isTransient: false,
        isPermanentlyInvalid: false,
        originalError: error instanceof Error ? error : null
      });
    }
  }

  /**
   * Validate feed content by attempting to parse it
   */
  async validateContent(content: string): Promise<ValidationResult> {
    try {
      const feedInfo = await this.parseFeed(content);
      return {
        url: '',  // URL will be filled in by the caller
        isValid: true,
        feedInfo
      };
    } catch (error: unknown) {
      if (error instanceof RSSFetchError) {
        return {
          url: '',  // URL will be filled in by the caller
          isValid: false,
          errorCategory: error.errorCategory,
          errorDetail: error.message
        };
      }
      return {
        url: '',  // URL will be filled in by the caller
        isValid: false,
        errorCategory: 'PARSE_ERROR',
        errorDetail: error instanceof Error ? error.message : 'Failed to parse feed content'
      };
    }
  }
} 