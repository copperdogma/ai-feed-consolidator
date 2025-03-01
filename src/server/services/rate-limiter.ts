import { EventEmitter } from 'events';

export interface RateLimiterOptions {
  tokensPerInterval: number;
  intervalMs: number;
  maxTokens: number;
}

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private options: RateLimiterOptions;
  private readonly events = new EventEmitter();

  constructor(options: RateLimiterOptions) {
    this.options = {
      ...options,
      maxTokens: options.maxTokens ?? options.tokensPerInterval
    };
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume tokens from the bucket
   * @returns Promise that resolves when tokens are available
   */
  async consume(tokens = 1): Promise<void> {
    this.refillTokens();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // Calculate how long to wait for the required tokens
    const tokensNeeded = tokens - this.tokens;
    const timePerToken = this.options.intervalMs / this.options.tokensPerInterval;
    const waitTime = Math.ceil(tokensNeeded * timePerToken);

    await new Promise(resolve => setTimeout(resolve, waitTime));
    return this.consume(tokens);
  }

  /**
   * Check if tokens are available without consuming them
   */
  canConsume(tokens = 1): boolean {
    this.refillTokens();
    return this.tokens >= tokens;
  }

  /**
   * Get current number of available tokens
   */
  getTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed * this.options.tokensPerInterval) / this.options.intervalMs;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(
        this.tokens + Math.floor(tokensToAdd),
        this.options.maxTokens
      );
      this.lastRefill = now - (timePassed % (this.options.intervalMs / this.options.tokensPerInterval));
    }
  }
} 