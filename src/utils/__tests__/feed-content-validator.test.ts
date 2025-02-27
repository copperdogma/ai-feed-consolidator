import { FeedContentValidator } from '../feed-content-validator';
import { HttpClient } from '../http-client';
import { XmlValidator } from '../xml-validator';
import { FeedInfo, ValidationResult, ErrorCategory } from '../../types/feed-types';
import { ErrorMapper } from '../error-mapper';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'node-fetch';

// Create mock implementations
const mockHttpClient = {
  get: vi.fn()
};

const mockXmlValidator = {
  validateXml: vi.fn()
};

interface EnhancedError extends Error {
  category?: string;
}

describe('FeedContentValidator', () => {
  let validator: FeedContentValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new FeedContentValidator({ 
      httpClient: mockHttpClient as unknown as HttpClient,
      xmlValidator: mockXmlValidator as unknown as XmlValidator 
    });
  });

  describe('validateFeed', () => {
    it('should handle non-200 responses', async () => {
      // Arrange
      const mockResponse = new Response('Not Found', { status: 404 });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCategory).toBe('HTTP_STATUS');
      expect(result.statusCode).toBe(404);
      expect(mockXmlValidator.validateXml).not.toHaveBeenCalled();
    });

    it('should handle SSL errors', async () => {
      // Arrange
      const sslError = new Error('unable to verify the first certificate');
      sslError.name = 'SSLError';
      (sslError as any).code = 'CERT_HAS_EXPIRED';
      mockHttpClient.get.mockRejectedValueOnce(sslError);

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Debug log the actual result
      console.log('SSL Error Test Result:', JSON.stringify(result, null, 2));

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCategory).toBe('SSL_ERROR');
      expect(result.errorDetail).toBe('unable to verify the first certificate');
    });

    it('should handle DNS errors', async () => {
      // Arrange
      const dnsError = new Error('getaddrinfo ENOTFOUND test.com');
      dnsError.name = 'Error';
      mockHttpClient.get.mockRejectedValueOnce(dnsError);

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCategory).toBe('DNS_ERROR');
      expect(result.errorDetail).toBe('getaddrinfo ENOTFOUND test.com');
    });

    it('should handle empty responses', async () => {
      // Arrange
      const mockResponse = new Response('', { status: 200 });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCategory).toBe('EMPTY_RESPONSE');
      expect(mockXmlValidator.validateXml).not.toHaveBeenCalled();
    });

    it('should handle XML validation errors', async () => {
      // Arrange
      const mockResponse = new Response('<invalid>xml</invalid>', { status: 200 });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);
      mockXmlValidator.validateXml.mockResolvedValueOnce({
        isValid: false,
        errorDetail: 'Invalid XML structure'
      });

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errorCategory).toBe('VALIDATION_ERROR');
      expect(result.errorDetail).toBe('Invalid XML structure');
    });

    it('should validate a valid feed', async () => {
      // Arrange
      const mockResponse = new Response('<valid>xml</valid>', { status: 200 });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);
      mockXmlValidator.validateXml.mockResolvedValueOnce({
        isValid: true,
        feedInfo: {
          title: 'Test Feed',
          description: 'A test feed',
          url: 'https://test.com'
        }
      });

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errorCategory).toBeUndefined();
      expect(result.feedInfo).toBeDefined();
      expect(result.feedInfo?.title).toBe('Test Feed');
    });
  });

  describe('special handling', () => {
    it('should mark feed as requiring special handling when fallback user agent was used', async () => {
      // Arrange
      const validFeedInfo = {
        title: 'Test Feed',
        description: 'Test Description',
        url: 'https://test.com'
      };

      const mockResponse = new Response('<feed>content</feed>', { status: 200 });
      Object.defineProperty(mockResponse, 'usedFallback', { value: true });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      mockXmlValidator.validateXml.mockResolvedValueOnce({
        isValid: true,
        feedInfo: validFeedInfo
      });

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result).toEqual({
        url: 'https://test.com/feed',
        isValid: true,
        feedInfo: validFeedInfo,
        requiresSpecialHandling: true,
        specialHandlerType: 'KIJIJI'
      });
    });

    it('should not mark feed as requiring special handling for normal requests', async () => {
      // Arrange
      const validFeedInfo = {
        title: 'Test Feed',
        description: 'Test Description',
        url: 'https://test.com'
      };

      const mockResponse = new Response('<feed>content</feed>', { status: 200 });
      Object.defineProperty(mockResponse, 'usedFallback', { value: false });
      mockHttpClient.get.mockResolvedValueOnce(mockResponse);

      mockXmlValidator.validateXml.mockResolvedValueOnce({
        isValid: true,
        feedInfo: validFeedInfo
      });

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result).toEqual({
        url: 'https://test.com/feed',
        isValid: true,
        feedInfo: validFeedInfo,
        requiresSpecialHandling: false,
        specialHandlerType: undefined
      });
    });

    it('should not include special handling info for failed validations', async () => {
      // Arrange
      mockHttpClient.get.mockResolvedValueOnce({
        status: 404,
        statusText: 'Not Found',
        ok: false,
        content: 'Not Found',
        usedFallback: false
      });

      // Act
      const result = await validator.validateFeed('https://test.com/feed');

      // Assert
      expect(result).toEqual({
        url: 'https://test.com/feed',
        isValid: false,
        errorCategory: 'HTTP_STATUS',
        errorDetail: 'HTTP 404: Not Found',
        statusCode: 404
      });
      expect(result.requiresSpecialHandling).toBeUndefined();
      expect(result.specialHandlerType).toBeUndefined();
    });
  });
}); 