import { RequestInit } from 'node-fetch';
import fetch, { AbortError, Response } from 'node-fetch';
import { HttpResponse, Headers } from '../types/http-types';

export type ErrorCategory = 
  | 'DNS_ERROR'
  | 'SSL_ERROR'
  | 'HTTP_STATUS'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'EMPTY_RESPONSE'
  | 'EMPTY_FEED';

export class HttpError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public status?: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  static readonly DEFAULT_USER_AGENT = 'AI-Feed-Consolidator/1.0';
  static readonly FALLBACK_USER_AGENT = 'Mozilla/5.0 (compatible)';

  private defaultAgent: string;
  private fallbackAgent: string;
  private currentUserAgent: string;
  private usedFallbackAgent: boolean;
  private timeout: number;

  constructor(defaultAgent?: string, fallbackAgent?: string, timeout: number = 10000) {
    this.defaultAgent = defaultAgent || HttpClient.DEFAULT_USER_AGENT;
    this.fallbackAgent = fallbackAgent || HttpClient.FALLBACK_USER_AGENT;
    this.currentUserAgent = this.defaultAgent;
    this.usedFallbackAgent = false;
    this.timeout = timeout;
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<HttpResponse> {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    const headers = {
      'User-Agent': this.currentUserAgent,
      ...(options.headers as Record<string, string> || {})
    };

    try {
      timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal as any
      });

      if (response.status === 403 && !this.usedFallbackAgent) {
        this.currentUserAgent = this.fallbackAgent;
        this.usedFallbackAgent = true;
        return this.makeRequest(url, options);
      }

      // Check for error headers
      const errorCode = response.headers.get('x-error-code');
      const errorMessage = response.headers.get('x-error-message');

      if (errorCode === 'CERT_HAS_EXPIRED') {
        throw new HttpError(errorMessage || 'SSL error occurred', 'SSL_ERROR');
      }

      if (errorCode === 'ENOTFOUND') {
        throw new HttpError(errorMessage || 'DNS lookup failed', 'DNS_ERROR');
      }

      if (!response.ok) {
        throw new HttpError(
          `HTTP error ${response.status}: ${response.statusText}`,
          'HTTP_STATUS',
          response.status
        );
      }

      return this.createHttpResponse(response, this.usedFallbackAgent);
    } catch (error: unknown) {
      if (error instanceof AbortError || (error as Error).name === 'AbortError') {
        throw new HttpError('Request timed out', 'TIMEOUT');
      }

      if (error instanceof HttpError) {
        throw error;
      }

      const fetchError = error as Error & { code?: string };
      if (fetchError.code === 'ENOTFOUND' || fetchError.message.includes('ENOTFOUND')) {
        throw new HttpError('DNS lookup failed', 'DNS_ERROR');
      }
      if (fetchError.code === 'CERT_HAS_EXPIRED' || 
          fetchError.message.includes('SSL') || 
          fetchError.message.includes('certificate')) {
        throw new HttpError('SSL error occurred', 'SSL_ERROR');
      }

      throw new HttpError(fetchError.message || 'Network error', 'NETWORK_ERROR');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private createHttpResponse(response: Response, usedFallback: boolean): HttpResponse {
    const headers = new Map<string, string>();
    for (const [key, value] of response.headers.entries()) {
      headers.set(key.toLowerCase(), value);
    }

    const httpResponse: HttpResponse = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: {
        get: (name: string) => headers.get(name.toLowerCase()) || null,
        ...Object.fromEntries(headers.entries())
      },
      text: () => response.text(),
      usedFallback
    };

    return httpResponse;
  }

  public async get(url: string, options: RequestInit = {}): Promise<HttpResponse> {
    return this.makeRequest(url, { ...options, method: 'GET' });
  }

  static async getStatic(url: string, options: RequestInit = {}): Promise<HttpResponse> {
    const client = new HttpClient();
    return client.get(url, options);
  }
} 