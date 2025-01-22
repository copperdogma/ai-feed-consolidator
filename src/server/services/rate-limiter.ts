import { EventEmitter } from 'events';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterOptions {
  tokensPerInterval: number;
  intervalMs: number;
  maxTokens?: number;
}

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private bucket: TokenBucket;
  private readonly maxTokens: number;
  private readonly tokensPerInterval: number;
  private readonly intervalMs: number;
  private readonly events = new EventEmitter();

  constructor(options: RateLimiterOptions) {
    this.tokensPerInterval = options.tokensPerInterval;
    this.intervalMs = options.intervalMs;
    this.maxTokens = options.maxTokens || options.tokensPerInterval;
    
    this.bucket = {
      tokens: this.maxTokens,
      lastRefill: Date.now()
    };
  }

  /**
   * Attempt to consume tokens from the bucket
   * @param tokens Number of tokens to consume
   * @returns Promise that resolves when tokens are available
   */
  async consume(tokens = 1): Promise<void> {
    this.refillTokens();

    if (this.bucket.tokens >= tokens) {
      this.bucket.tokens -= tokens;
      return;
    }

    // Wait for tokens to be available
    return new Promise((resolve) => {
      const check = () => {
        this.refillTokens();
        if (this.bucket.tokens >= tokens) {
          this.bucket.tokens -= tokens;
          resolve();
        } else {
          // Calculate time until next token is available
          const timeToNextToken = this.calculateTimeToNextToken(tokens);
          setTimeout(() => check(), timeToNextToken);
        }
      };

      check();
    });
  }

  /**
   * Check if tokens are available without consuming them
   */
  canConsume(tokens = 1): boolean {
    this.refillTokens();
    return this.bucket.tokens >= tokens;
  }

  /**
   * Get current number of available tokens
   */
  getTokens(): number {
    this.refillTokens();
    return this.bucket.tokens;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.bucket.lastRefill;
    const tokensToAdd = (timePassed / this.intervalMs) * this.tokensPerInterval;

    if (tokensToAdd >= 1) {
      this.bucket.tokens = Math.min(
        this.maxTokens,
        this.bucket.tokens + Math.floor(tokensToAdd)
      );
      this.bucket.lastRefill = now;
    }
  }

  private calculateTimeToNextToken(tokensNeeded: number): number {
    const tokensToWaitFor = tokensNeeded - this.bucket.tokens;
    return Math.ceil((tokensToWaitFor / this.tokensPerInterval) * this.intervalMs);
  }
} 