import { HttpClient, HttpError } from './http-client';
import { HttpResponse } from '../types/http-types';
import { XmlValidator } from './xml-validator';
import { ValidationResult, ErrorCategory, FeedInfo } from '../types/feed-types';
import { ErrorMapper } from './error-mapper';
import { XMLParser } from 'fast-xml-parser';

export interface FeedValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
  feedTitle?: string;
  feedDescription?: string;
  itemCount?: number;
  feedInfo?: FeedInfo;
  requiresSpecialHandling?: boolean;
}

export interface FeedValidationSummary {
  totalChecked: number;
  validFeeds: number;
  invalidFeeds: number;
  errorsByCategory: { [key in ErrorCategory]?: number };
  resultsByCategory: { [key in ErrorCategory]?: FeedValidationResult[] };
  results: FeedValidationResult[];
}

export class EnhancedFeedValidator {
  private httpClient: HttpClient;
  private xmlValidator: XmlValidator;
  private xmlParser: XMLParser;

  constructor() {
    this.httpClient = new HttpClient();
    this.xmlValidator = new XmlValidator();
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public async validateFeed(url: string): Promise<FeedValidationResult> {
    // Validate URL format first
    if (!this.isValidUrl(url)) {
      console.log('DEBUG: Invalid URL format:', url);
      return {
        url,
        isValid: false,
        errorCategory: 'VALIDATION_ERROR',
        errorDetail: 'Invalid URL format'
      };
    }

    try {
      // Make HTTP request and get content
      console.log('DEBUG: Making HTTP request to:', url);
      const response = await HttpClient.getStatic(url);
      const content = await response.text();

      // Check for empty response
      if (!content || content.trim().length === 0) {
        console.log('DEBUG: Empty response received');
        return {
          url,
          isValid: false,
          errorCategory: 'EMPTY_RESPONSE',
          errorDetail: 'Empty response'
        };
      }

      // Validate XML structure
      console.log('DEBUG: Validating XML structure');
      const xmlValidationResult = await this.xmlValidator.validateXml(content, url);
      
      // Handle empty feeds
      if (xmlValidationResult.isValid && (!xmlValidationResult.feedInfo?.items || xmlValidationResult.feedInfo.items.length === 0)) {
        return {
          url,
          isValid: false,
          errorCategory: 'EMPTY_FEED',
          errorDetail: 'Feed contains no items',
          feedInfo: xmlValidationResult.feedInfo
        };
      }

      if (!xmlValidationResult.isValid) {
        return {
          url,
          isValid: false,
          errorCategory: xmlValidationResult.errorCategory,
          errorDetail: xmlValidationResult.errorDetail?.includes('Invalid XML') 
            ? 'Invalid XML structure'
            : xmlValidationResult.errorDetail,
          feedInfo: xmlValidationResult.feedInfo
        };
      }

      return {
        url,
        isValid: true,
        feedInfo: xmlValidationResult.feedInfo,
        statusCode: response.status
      };

    } catch (error: any) {
      console.log('DEBUG: Error caught in validateFeed:', error);
      
      if (error instanceof HttpError) {
        console.log('DEBUG: HttpError category:', error.category);
        return {
          url,
          isValid: false,
          errorCategory: error.category as ErrorCategory,
          errorDetail: error.message,
          statusCode: error.status
        };
      }

      // For non-HttpError errors, determine category based on error message
      const errorMessage = error.message || 'Unknown error';
      console.log('DEBUG: Non-HttpError message:', errorMessage);
      
      // Check for specific error patterns
      if (error.code === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND')) {
        return {
          url,
          isValid: false,
          errorCategory: 'DNS_ERROR',
          errorDetail: 'DNS lookup failed',
          statusCode: 523
        };
      }

      if (error.code === 'CERT_HAS_EXPIRED' || 
          errorMessage.includes('SSL') || 
          errorMessage.includes('certificate')) {
        return {
          url,
          isValid: false,
          errorCategory: 'SSL_ERROR',
          errorDetail: 'SSL error occurred',
          statusCode: 525
        };
      }

      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        return {
          url,
          isValid: false,
          errorCategory: 'TIMEOUT',
          errorDetail: 'Request timed out',
          statusCode: 408
        };
      }

      if (error.status) {
        return {
          url,
          isValid: false,
          errorCategory: 'HTTP_STATUS',
          errorDetail: `HTTP error ${error.status}`,
          statusCode: error.status
        };
      }

      return {
        url,
        isValid: false,
        errorCategory: this.determineErrorCategory(errorMessage),
        errorDetail: errorMessage,
        statusCode: 503
      };
    }
  }

  private determineErrorCategory(errorMessage: string): ErrorCategory {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('enotfound') || lowerMessage.includes('dns')) {
      return 'DNS_ERROR';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
      return 'TIMEOUT';
    }
    if (lowerMessage.includes('ssl') || lowerMessage.includes('certificate') || lowerMessage.includes('tls')) {
      return 'SSL_ERROR';
    }
    if (lowerMessage.includes('404') || lowerMessage.includes('403') || lowerMessage.includes('500')) {
      return 'HTTP_STATUS';
    }
    if (lowerMessage.includes('empty') || lowerMessage.includes('no content')) {
      return 'EMPTY_RESPONSE';
    }
    if (lowerMessage.includes('parse') || lowerMessage.includes('invalid xml')) {
      return 'VALIDATION_ERROR';
    }
    if (lowerMessage.includes('no items') || lowerMessage.includes('empty feed')) {
      return 'EMPTY_FEED';
    }

    return 'NETWORK_ERROR';
  }

  public async validateFeeds(urls: string[]): Promise<FeedValidationSummary> {
    const results = await Promise.all(urls.map(url => this.validateFeed(url)));
    
    const summary: FeedValidationSummary = {
      totalChecked: results.length,
      validFeeds: results.filter(r => r.isValid).length,
      invalidFeeds: results.filter(r => !r.isValid).length,
      errorsByCategory: {},
      resultsByCategory: {},
      results
    };

    // Group results by error category
    results.forEach(result => {
      if (!result.isValid && result.errorCategory) {
        summary.errorsByCategory[result.errorCategory] = (summary.errorsByCategory[result.errorCategory] || 0) + 1;
        summary.resultsByCategory[result.errorCategory] = summary.resultsByCategory[result.errorCategory] || [];
        summary.resultsByCategory[result.errorCategory]!.push(result);
      }
    });

    return summary;
  }
} 