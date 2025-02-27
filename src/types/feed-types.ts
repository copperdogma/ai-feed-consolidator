import { FeedValidationResult } from './feed-validation';

export interface FeedInfo {
  title: string;
  description: string;
  url?: string;
  items?: FeedItem[];
  language?: string;
  copyright?: string;
  pubDate?: string;
  lastBuildDate?: string;
}

export interface FeedItem {
  title: string;
  description: string;
  url?: string;
  guid?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
}

export type ErrorCategory = 
  | 'HTTP_STATUS'
  | 'TIMEOUT'
  | 'DNS_ERROR'
  | 'SSL_ERROR'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESPONSE'
  | 'EMPTY_FEED'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'
  | 'EMPTY_CONTENT'
  | 'MISSING_REQUIRED';

export type SpecialHandlerType = 'KIJIJI';

export interface ValidationResult {
  url: string;
  isValid: boolean;
  feedInfo?: FeedInfo;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
  statusCode?: number;
  requiresSpecialHandling?: boolean;
  specialHandlerType?: SpecialHandlerType;
}

export interface FeedHandler {
  validateFeed(url: string): Promise<ValidationResult>;
}

export interface FeedValidationSummary {
  totalChecked: number;
  validFeeds: number;
  invalidFeeds: number;
  results: FeedValidationResult[];
  resultsByCategory?: Record<ErrorCategory, FeedValidationResult[]>;
} 