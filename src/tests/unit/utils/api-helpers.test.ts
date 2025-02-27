import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { APIError, handleAPIResponse } from '../../../utils/api-helpers';
import { UnitTestBase } from '../../utils/UnitTestBase';

class APIHelpersTest extends UnitTestBase {
  constructor() {
    super();
  }

  public async setup() {
    await super.setup();
  }

  public async cleanup() {
    await super.cleanup();
  }
}

describe('API Helpers', () => {
  let testInstance: APIHelpersTest;

  beforeAll(async () => {
    testInstance = new APIHelpersTest();
    await testInstance.setup();
  });

  afterAll(async () => {
    await testInstance.cleanup();
  });

  describe('APIError', () => {
    it('should create an error with status and details', () => {
      const error = new APIError('Test error', 404, { reason: 'Not found' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(404);
      expect(error.details).toEqual({ reason: 'Not found' });
    });

    it('should create an error without details', () => {
      const error = new APIError('Test error', 500);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.details).toBeUndefined();
    });
  });

  describe('handleAPIResponse', () => {
    it('should parse successful JSON response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response;

      const result = await handleAPIResponse(mockResponse, 'Error message');
      expect(result).toEqual({ data: 'test' });
    });

    it('should throw APIError with JSON details on error', async () => {
      const errorDetails = { message: 'Invalid input' };
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve(errorDetails),
      } as Response;

      await expect(handleAPIResponse(mockResponse, 'Failed to process request'))
        .rejects
        .toThrow(APIError);

      try {
        await handleAPIResponse(mockResponse, 'Failed to process request');
      } catch (error) {
        if (error instanceof APIError) {
          expect(error.message).toBe('Failed to process request');
          expect(error.status).toBe(400);
          expect(error.details).toEqual(errorDetails);
        } else {
          throw error;
        }
      }
    });

    it('should handle text error response when JSON parsing fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('Internal server error'),
      } as Response;

      try {
        await handleAPIResponse(mockResponse, 'Server error');
      } catch (error) {
        if (error instanceof APIError) {
          expect(error.message).toBe('Server error');
          expect(error.status).toBe(500);
          expect(error.details).toBe('Internal server error');
        } else {
          throw error;
        }
      }
    });
  });
}); 