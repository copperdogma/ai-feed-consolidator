import { ValidationResult, ErrorCategory, FeedInfo } from '../types/feed-types';
import { parseFeedXml } from './xml-utils';

export class XmlValidator {
  public async validateXml(content: string, url: string): Promise<ValidationResult> {
    if (!content || content.trim().length === 0) {
      return {
        url,
        isValid: false,
        statusCode: 200,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: 'Empty feed content',
        feedInfo: undefined,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      };
    }

    try {
      const feed = await parseFeedXml(content);
      
      // Check for required elements
      if (!feed.title) {
        return {
          url,
          isValid: false,
          statusCode: 200,
          errorCategory: 'VALIDATION_ERROR',
          errorDetail: 'Missing required elements: title',
          feedInfo: {
            description: feed.description || ''
          } as FeedInfo,
          requiresSpecialHandling: false,
          specialHandlerType: undefined
        };
      }

      // Transform items if present
      const items = feed.items?.map(item => ({
        title: item.title,
        description: item.description,
        url: item.url,
        pubDate: item.pubDate
      }));

      const feedInfo: FeedInfo = {
        title: feed.title,
        description: feed.description || ''
      };

      if (feed.url) {
        feedInfo.url = feed.url;
      }

      if (items && items.length > 0) {
        feedInfo.items = items;
      }

      return {
        url,
        isValid: true,
        statusCode: 200,
        feedInfo,
        errorCategory: undefined,
        errorDetail: undefined,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for specific error types
      if (errorMessage.includes('Non-whitespace before first tag')) {
        return {
          url,
          isValid: false,
          statusCode: 200,
          errorCategory: 'VALIDATION_ERROR',
          errorDetail: 'Invalid XML',
          feedInfo: undefined,
          requiresSpecialHandling: false,
          specialHandlerType: undefined
        };
      }

      return {
        url,
        isValid: false,
        statusCode: 200,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: `Failed to parse XML: ${errorMessage}`,
        feedInfo: undefined,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      };
    }
  }
} 