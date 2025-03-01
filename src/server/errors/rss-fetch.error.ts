export type RSSFetchErrorCode = 
  | 'INVALID_URL'
  | 'PARSE_ERROR'
  | 'NO_VALID_ITEMS'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR';

export class RSSFetchError extends Error {
  constructor(
    message: string,
    public readonly code: RSSFetchErrorCode
  ) {
    super(message);
    this.name = 'RSSFetchError';
  }
} 