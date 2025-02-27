import { KijijiHandler } from '../kijiji-handler';
import { HttpClient } from '../../utils/http-client';
import { XmlValidator } from '../../utils/xml-validator';
import { FeedContentValidator } from '../../utils/feed-content-validator';
import { ValidationResult } from '../../types/feed-types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the dependencies
vi.mock('../../utils/http-client');
vi.mock('../../utils/xml-validator');
vi.mock('../../utils/feed-content-validator');

describe('KijijiHandler', () => {
  const MockedHttpClient = HttpClient as unknown as { new(...args: any[]): HttpClient };
  const MockedXmlValidator = XmlValidator as unknown as { new(...args: any[]): XmlValidator };
  const MockedFeedContentValidator = FeedContentValidator as unknown as { new(...args: any[]): FeedContentValidator };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      // Act
      new KijijiHandler();

      // Assert
      expect(MockedHttpClient).toHaveBeenCalledWith({
        defaultUserAgent: 'AI Feed Consolidator',
        fallbackUserAgent: 'Mozilla/5.0',
        timeout: 30000
      });

      expect(MockedXmlValidator).toHaveBeenCalled();
      expect(MockedFeedContentValidator).toHaveBeenCalledWith({
        httpClient: expect.any(HttpClient),
        xmlValidator: expect.any(XmlValidator)
      });
    });
  });

  describe('validateFeed', () => {
    it('should delegate validation to FeedContentValidator', async () => {
      // Arrange
      const handler = new KijijiHandler();
      const mockValidationResult: ValidationResult = {
        url: 'https://test.com/feed',
        isValid: true,
        feedInfo: {
          title: 'Test Feed',
          description: 'Test Description'
        }
      };

      const mockValidator = vi.mocked(FeedContentValidator).mock.instances[0];
      vi.spyOn(mockValidator, 'validateFeed').mockResolvedValueOnce(mockValidationResult);

      // Act
      const result = await handler.validateFeed('https://test.com/feed');

      // Assert
      expect(mockValidator.validateFeed).toHaveBeenCalledWith('https://test.com/feed');
      expect(result).toBe(mockValidationResult);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const handler = new KijijiHandler();
      const mockErrorResult: ValidationResult = {
        url: 'https://test.com/feed',
        isValid: false,
        errorCategory: 'HTTP_STATUS',
        errorDetail: 'HTTP 404: Not Found',
        statusCode: 404
      };

      const mockValidator = vi.mocked(FeedContentValidator).mock.instances[0];
      vi.spyOn(mockValidator, 'validateFeed').mockResolvedValueOnce(mockErrorResult);

      // Act
      const result = await handler.validateFeed('https://test.com/feed');

      // Assert
      expect(mockValidator.validateFeed).toHaveBeenCalledWith('https://test.com/feed');
      expect(result).toBe(mockErrorResult);
    });

    it('should handle validation with special handling', async () => {
      // Arrange
      const handler = new KijijiHandler();
      const mockValidationResult: ValidationResult = {
        url: 'https://test.com/feed',
        isValid: true,
        feedInfo: {
          title: 'Test Feed',
          description: 'Test Description'
        },
        requiresSpecialHandling: true,
        specialHandlerType: 'KIJIJI'
      };

      const mockValidator = vi.mocked(FeedContentValidator).mock.instances[0];
      vi.spyOn(mockValidator, 'validateFeed').mockResolvedValueOnce(mockValidationResult);

      // Act
      const result = await handler.validateFeed('https://test.com/feed');

      // Assert
      expect(mockValidator.validateFeed).toHaveBeenCalledWith('https://test.com/feed');
      expect(result).toBe(mockValidationResult);
    });
  });
}); 