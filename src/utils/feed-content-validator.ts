import { HttpClient } from './http-client';
import { XmlValidator } from './xml-validator';
import { ValidationResult } from '../types/feed-types';
import { ErrorMapper } from './error-mapper';
import { HttpResponse } from '../types/http-types';

interface FeedContentValidatorConfig {
  httpClient: HttpClient;
  xmlValidator: XmlValidator;
}

export class FeedContentValidator {
  private httpClient: HttpClient;
  private xmlValidator: XmlValidator;

  constructor(config: { httpClient: HttpClient; xmlValidator: XmlValidator }) {
    this.httpClient = config.httpClient;
    this.xmlValidator = config.xmlValidator;
  }

  async validateFeed(url: string): Promise<ValidationResult> {
    try {
      const response = await this.httpClient.get(url) as HttpResponse;

      // Handle status 0 responses first (network/SSL errors)
      if (response.status === 0) {
        const errorText = response.statusText?.toLowerCase() || '';

        // Check for SSL errors first
        if (errorText.includes('certificate')) {
          return {
            url,
            isValid: false,
            errorCategory: 'SSL_ERROR',
            errorDetail: response.statusText || 'SSL certificate error',
            statusCode: response.status
          };
        }

        // Handle both node-fetch Headers and MSW Headers
        const headers = response.headers;
        const errorName = typeof headers.get === 'function' ? headers.get('x-error-name') : (headers as any)['x-error-name'];
        const errorCode = typeof headers.get === 'function' ? headers.get('x-error-code') : (headers as any)['x-error-code'];

        // Check for SSL errors in headers
        if (
          errorName === 'SSLError' || 
          errorCode === 'CERT_ERROR' || 
          (response as any).error?.name === 'SSLError' ||
          (response as any).error?.code === 'CERT_ERROR'
        ) {
          return {
            url,
            isValid: false,
            errorCategory: 'SSL_ERROR',
            errorDetail: response.statusText || 'SSL certificate error',
            statusCode: response.status
          };
        }

        // Check for DNS errors
        if (
          errorName === 'DNSError' || 
          errorCode === 'ENOTFOUND' || 
          errorText.includes('getaddrinfo') ||
          (response as any).error?.name === 'DNSError' ||
          (response as any).error?.code === 'ENOTFOUND'
        ) {
          return {
            url,
            isValid: false,
            errorCategory: 'DNS_ERROR',
            errorDetail: response.statusText || 'DNS lookup failed',
            statusCode: response.status
          };
        }

        // Default to network error for status 0
        return {
          url,
          isValid: false,
          errorCategory: 'NETWORK_ERROR',
          errorDetail: response.statusText || 'Network error occurred',
          statusCode: response.status
        };
      }

      // Then handle non-200 responses
      if (!response.ok) {
        return ErrorMapper.mapHttpStatus(response, url);
      }

      // Check for SSL errors in the headers even for successful responses
      const headers = response.headers;
      const errorName = typeof headers.get === 'function' ? headers.get('x-error-name') : (headers as any)['x-error-name'];
      const errorCode = typeof headers.get === 'function' ? headers.get('x-error-code') : (headers as any)['x-error-code'];
      const errorText = response.statusText?.toLowerCase() || '';

      if (
        errorName === 'SSLError' || 
        errorCode === 'CERT_ERROR' || 
        errorText.includes('certificate') ||
        (response as any).error?.name === 'SSLError' ||
        (response as any).error?.code === 'CERT_ERROR'
      ) {
        return {
          url,
          isValid: false,
          errorCategory: 'SSL_ERROR',
          errorDetail: response.statusText || 'SSL certificate error',
          statusCode: response.status
        };
      }

      // Get response content
      const content = await response.text();

      // Handle empty responses
      if (!content || content.trim().length === 0) {
        return ErrorMapper.createEmptyResponseError(url, response.status);
      }

      // Validate XML content
      const xmlValidationResult = await this.xmlValidator.validateXml(content, url);
      
      // If validation failed, map the error
      if (!xmlValidationResult.isValid) {
        return ErrorMapper.mapValidationError(xmlValidationResult, url);
      }

      // Success case - preserve any special handling flags
      return {
        ...xmlValidationResult,
        url,
        requiresSpecialHandling: response.usedFallback,
        specialHandlerType: response.usedFallback ? 'KIJIJI' : undefined
      };

    } catch (error: any) {
      const errorInfo = ErrorMapper.categorizeError(error);
      return {
        url,
        isValid: false,
        errorCategory: errorInfo.category,
        errorDetail: errorInfo.detail,
        statusCode: undefined
      };
    }
  }
} 