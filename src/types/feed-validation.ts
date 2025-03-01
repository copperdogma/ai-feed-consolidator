/**
 * Core validation types for feed validation system.
 * Focused solely on determining if a feed is valid and categorizing any issues.
 */

import { ErrorCategory } from './feed-types';

export type ValidationErrorCategory =
  | 'INVALID_CONTENT'  // Feed content issues (XML, empty)
  | 'UNREACHABLE'      // Cannot reach feed (DNS, SSL, network)
  | 'UNAVAILABLE'      // Feed exists but inaccessible (404, 403)
  | 'TIMEOUT';         // Request timed out

export interface FeedInfo {
  title?: string;
  description?: string;
  items: Array<{
    title: string;
    url: string;
    description?: string;
    pubDate?: string;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  feedInfo?: FeedInfo;
  errorCategory?: ValidationErrorCategory;
  errorDetail?: string;
  statusCode?: number;
}

// Mapping from HTTP status codes to validation categories
export const HTTP_STATUS_TO_CATEGORY: Record<number, ValidationErrorCategory> = {
  404: 'UNAVAILABLE',
  410: 'UNAVAILABLE',
  403: 'UNAVAILABLE',
  401: 'UNAVAILABLE',
  408: 'TIMEOUT',
  504: 'TIMEOUT',
  523: 'UNREACHABLE', // DNS error
  525: 'UNREACHABLE', // SSL error
  503: 'UNREACHABLE'  // Network error
};

export interface FeedValidationResult {
  url: string;
  isValid: boolean;
  statusCode: number;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
  feedTitle?: string;
  feedDescription?: string;
  itemCount?: number;
}

export interface FeedValidationSummary {
  totalChecked: number;
  validFeeds: number;
  invalidFeeds: number;
  results: FeedValidationResult[];
  resultsByCategory?: Record<ErrorCategory, FeedValidationResult[]>;
} 