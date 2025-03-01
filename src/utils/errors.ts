export class OpenAIError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class HttpError extends Error {
  readonly category: string;
  readonly status?: number;
  readonly code?: string;
  readonly errorCategory?: string;

  constructor(message: string, category: string, status?: number, details?: { code?: string; errorCategory?: string }) {
    super(message);
    this.name = 'HttpError';
    this.category = category;
    this.status = status;
    this.code = details?.code;
    this.errorCategory = details?.errorCategory;
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'RateLimitError';
  }
} 