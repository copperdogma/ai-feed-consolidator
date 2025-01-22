import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should allow requests within rate limit', async () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 2,
      intervalMs: 1000
    });

    await expect(limiter.consume()).resolves.toBeUndefined();
    await expect(limiter.consume()).resolves.toBeUndefined();
    expect(limiter.canConsume()).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 2,
      intervalMs: 1000
    });

    // Use all tokens
    await limiter.consume(2);
    expect(limiter.canConsume()).toBe(false);

    // Advance time by 500ms (should add 1 token)
    vi.advanceTimersByTime(500);
    expect(limiter.canConsume()).toBe(true);

    // Advance time by another 500ms (should add another token)
    vi.advanceTimersByTime(500);
    expect(limiter.canConsume(2)).toBe(true);
  });

  it('should respect max tokens limit', async () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 2,
      intervalMs: 1000,
      maxTokens: 3
    });

    // Wait for 2 intervals (should only accumulate up to maxTokens)
    vi.advanceTimersByTime(2000);
    expect(limiter.getTokens()).toBe(3);
  });

  it('should wait for tokens to become available', async () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 1,
      intervalMs: 1000
    });

    // Use the only available token
    await limiter.consume();

    // Start consuming another token (should wait)
    const consumePromise = limiter.consume();
    
    // Advance time by 1 second
    vi.advanceTimersByTime(1000);
    
    // Now the promise should resolve
    await expect(consumePromise).resolves.toBeUndefined();
  });

  it('should handle fractional token refills', async () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 1,
      intervalMs: 1000
    });

    // Use the token
    await limiter.consume();

    // Advance by 500ms (should not add any tokens yet)
    vi.advanceTimersByTime(500);
    expect(limiter.canConsume()).toBe(false);

    // Advance by another 500ms (should add 1 token)
    vi.advanceTimersByTime(500);
    expect(limiter.canConsume()).toBe(true);
  });
}); 