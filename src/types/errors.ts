import { ErrorCategory } from './feed-types';

export interface HttpErrorOptions {
  message: string;
  code?: string;
  errorCategory?: ErrorCategory;
  statusCode?: number;
}

export class HttpError extends Error {
  public readonly code: string;
  public readonly errorCategory: ErrorCategory;
  public readonly statusCode?: number;

  constructor(options: HttpErrorOptions) {
    super(options.message);
    this.name = 'HttpError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.errorCategory = options.errorCategory || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode;
  }
} 