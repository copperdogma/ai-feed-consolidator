import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpClient, HttpError } from '../http-client';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

interface ExtendedError extends Error {
  code?: string;
}

const server = setupServer(
  http.get('https://example.com', () => {
    return HttpResponse.text('content');
  }),

  http.get('https://forbidden.example.com', ({ request }) => {
    const userAgent = request.headers.get('user-agent');
    if (userAgent === HttpClient.DEFAULT_USER_AGENT) {
      return new HttpResponse(null, { status: 403 });
    }
    return HttpResponse.text('content');
  }),

  http.get('https://timeout.example.com', () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    });
  }),

  http.get('https://expired-cert.example.com', () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'x-error-code': 'CERT_HAS_EXPIRED',
        'x-error-message': 'SSL error occurred'
      }
    });
  }),

  http.get('https://nonexistent.example.com', () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'x-error-code': 'ENOTFOUND',
        'x-error-message': 'DNS lookup failed'
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HttpClient', () => {
  describe('instance methods (using fetch)', () => {
    it('should make a request with default user agent', async () => {
      const client = new HttpClient();
      const response = await client.get('https://example.com');
      expect(response.ok).toBe(true);
      const text = await response.text();
      expect(text).toBe('content');
      expect(response.usedFallback).toBe(false);
    });

    it('should retry with fallback user agent on 403', async () => {
      const client = new HttpClient();
      const response = await client.get('https://forbidden.example.com');
      expect(response.ok).toBe(true);
      const text = await response.text();
      expect(text).toBe('content');
      expect(response.usedFallback).toBe(true);
    });
  });

  describe('static methods (using fetch)', () => {
    it('should make a request with default user agent', async () => {
      const response = await HttpClient.getStatic('https://example.com');
      expect(response.ok).toBe(true);
      const text = await response.text();
      expect(text).toBe('content');
      expect(response.usedFallback).toBe(false);
    });

    it('should handle timeout errors', async () => {
      const promise = HttpClient.getStatic('https://timeout.example.com');
      await expect(promise)
        .rejects
        .toThrow(new HttpError('Request timed out', 'TIMEOUT'));
    });

    it('should handle SSL errors', async () => {
      const promise = HttpClient.getStatic('https://expired-cert.example.com');
      await expect(promise)
        .rejects
        .toThrow(new HttpError('SSL error occurred', 'SSL_ERROR'));
    });

    it('should handle DNS errors', async () => {
      const promise = HttpClient.getStatic('https://nonexistent.example.com');
      await expect(promise)
        .rejects
        .toThrow(new HttpError('DNS lookup failed', 'DNS_ERROR'));
    });
  });
}); 