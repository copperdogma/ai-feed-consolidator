import { Response, RequestInit } from 'node-fetch';
import fetch from 'node-fetch';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function fetchWithUserAgent(url: string, userAgent: string, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const options: RequestInit = {
      headers: {
        'User-Agent': userAgent
      },
      signal: controller.signal as any // Type assertion needed due to incompatible AbortSignal types
    };

    const response = await fetch(url, options);
    
    // Handle status 0 responses as errors
    if (response.status === 0) {
      const error = new Error(response.statusText || 'Network error');
      const errorName = response.headers.get('x-error-name');
      const errorCode = response.headers.get('x-error-code');
      
      (error as any).response = {
        status: 0,
        statusText: response.statusText,
        headers: response.headers,
        ok: false,
        errorName,
        errorCode
      };
      throw error;
    }
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
} 