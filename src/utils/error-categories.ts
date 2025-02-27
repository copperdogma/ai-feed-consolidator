import { ErrorCategory } from '../types/feed-types';

export const ErrorCategories = {
  DNS_ERROR: 'DNS_ERROR' as ErrorCategory,
  TIMEOUT: 'TIMEOUT' as ErrorCategory,
  NETWORK_ERROR: 'NETWORK_ERROR' as ErrorCategory,
  SSL_ERROR: 'SSL_ERROR' as ErrorCategory,
  HTTP_STATUS: 'HTTP_STATUS' as ErrorCategory,
  VALIDATION_ERROR: 'VALIDATION_ERROR' as ErrorCategory,
  EMPTY_RESPONSE: 'EMPTY_RESPONSE' as ErrorCategory,
  EMPTY_FEED: 'EMPTY_FEED' as ErrorCategory,
} as const; 