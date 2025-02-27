export type ErrorCategory = 
  | 'HTTP_STATUS'
  | 'SSL_ERROR'
  | 'DNS_ERROR'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'EMPTY_FEED'
  | 'EMPTY_RESPONSE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
  | 'VALIDATION_ERROR'
  | 'USER_NOT_FOUND'
  | 'AUTH_ERROR';

export type SpecialHandlerType =
  | 'KIJIJI'
  | 'PROTECTED'
  | 'LEGACY'
  | 'REDIRECT';

export interface FeedHealthUpdate {
  errorCount: number;
  lastError: string;
  errorCategory: ErrorCategory;
  isPermanentlyInvalid: boolean;
}

export interface FeedHealth {
  id: number;
  feed_config_id: number;
  last_check_at: Date | null;
  consecutive_failures: number;
  last_error_category: ErrorCategory | null;
  last_error_detail: string | null;
  is_permanently_invalid: boolean;
  requires_special_handling: boolean;
  special_handler_type: SpecialHandlerType | null;
  created_at: Date;
  updated_at: Date;
}

export interface FeedItem {
  title: string;
  description: string;
  url: string;
  guid: string;
  pubDate: string;
}

export interface FeedInfo {
  title?: string;
  description?: string;
  url: string;
  items?: FeedItem[];
}

export interface ValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  contentType?: string;
  errorCategory?: ErrorCategory;
  errorDetail?: string;
  feedInfo?: FeedInfo;
  isPermanentlyInvalid?: boolean;
  requiresSpecialHandling?: boolean;
  specialHandlerType?: SpecialHandlerType;
} 
