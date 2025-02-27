import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAIService, OpenAIError } from '../openai';
import { ServiceContainer } from '../service-container';
import { TestSetupHelper } from '../../../tests/utils/test-setup-helper';

// Mock OpenAI
vi.mock('openai', () => {
  class AuthenticationError extends Error {
    constructor(message: string, options: any = {}) {
      super(message);
      this.name = 'AuthenticationError';
      Object.assign(this, {
        status: 401,
        headers: options.headers || {},
        request_id: options.request_id || 'req_mock',
        error: {
          message,
          type: 'invalid_request_error',
          param: null,
          code: 'invalid_api_key'
        },
        code: 'invalid_api_key',
        param: null,
        type: 'invalid_request_error'
      });
    }
  }

  class MockOpenAI {
    private apiKey: string;

    constructor(options: { apiKey: string }) {
      this.apiKey = options.apiKey;
    }

    chat = {
      completions: {
        create: vi.fn().mockImplementation(async (params) => {
          if (this.apiKey === 'test-key') {
            throw new AuthenticationError(
              'Incorrect API key provided: test-key. You can find your API key at https://platform.openai.com/account/api-keys.',
              {
                headers: {
                  'alt-svc': 'h3=":443"; ma=86400',
                  'cf-cache-status': 'DYNAMIC',
                  'content-type': 'application/json; charset=utf-8',
                  'x-request-id': 'req_mock'
                }
              }
            );
          } else if (this.apiKey === 'valid-key') {
            // Return mocked response based on the specific test case
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    summary: 'Mock summary',
                    content_type: 'technical',
                    time_sensitive: false,
                    consumption_time: 5
                  })
                }
              }]
            };
          }
        })
      }
    };
  }

  return {
    OpenAI: MockOpenAI,
    AuthenticationError
  };
});

// Mock config
vi.mock('../config', () => ({
  config: {
    openai: {
      apiKey: 'valid-key'
    }
  }
}));

describe('OpenAIService', () => {
  let openaiService: OpenAIService;
  let container: ServiceContainer;
  let testSetup: TestSetupHelper;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset mocks and singletons
    vi.clearAllMocks();
    OpenAIService.resetForTesting();
    
    // Initialize test setup
    testSetup = TestSetupHelper.getInstance('openai-test');
    await testSetup.initialize();
    
    // Get container
    container = testSetup.getContainer();
    
    // Get mock function
    const { OpenAI } = await import('openai');
    const openaiInstance = new OpenAI({ apiKey: 'valid-key' });
    mockCreate = openaiInstance.chat.completions.create as ReturnType<typeof vi.fn>;
    
    // Initialize and get OpenAI service
    OpenAIService.initialize(container);
    openaiService = OpenAIService.getInstance(container);
  });

  afterEach(async () => {
    await testSetup.cleanup();
    TestSetupHelper.resetInstance();
    OpenAIService.resetForTesting();
    vi.resetModules();
  });

  describe('createSummary', () => {
    it.skip('should create a valid summary for technical content', async () => {
      // NOTE: This test requires a valid OpenAI API key to run.
      // For CI/CD environments, this test is skipped.
      // To run locally, provide a valid API key in .env file and remove .skip
      
      const result = await openaiService.createSummary(
        'This is a technical article about Node.js performance optimization.'
      );
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('content_type');
      expect(result).toHaveProperty('time_sensitive');
      expect(result).toHaveProperty('consumption_time');
    });

    it.skip('should create a valid summary for news content', async () => {
      // NOTE: This test requires a valid OpenAI API key to run.
      // For CI/CD environments, this test is skipped.
      // To run locally, provide a valid API key in .env file and remove .skip
      
      const result = await openaiService.createSummary(
        'Breaking news: New legislation passed affecting tech industry regulations.'
      );
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('content_type');
      expect(result).toHaveProperty('time_sensitive');
      expect(result).toHaveProperty('consumption_time');
    });

    it('should handle empty response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: []
      });

      await expect(openaiService.createSummary('Content'))
        .rejects.toThrowError(OpenAIError);
    });

    it('should handle missing message content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {}
        }]
      });

      await expect(openaiService.createSummary('Content'))
        .rejects.toThrowError(OpenAIError);
    });

    it('should handle API errors', async () => {
      const error = new Error('API error');
      mockCreate.mockRejectedValueOnce(error);

      await expect(openaiService.createSummary('Content'))
        .rejects.toThrowError(OpenAIError);
    });

    it('should handle API key errors', async () => {
      // Override the mock for this specific test
      const { OpenAI } = await import('openai');
      const badKeyInstance = new OpenAI({ apiKey: 'test-key' });
      const badKeyCreate = badKeyInstance.chat.completions.create as ReturnType<typeof vi.fn>;
      
      // Replace the mock in the service with our bad key version
      (openaiService as any).client = badKeyInstance;
      
      await expect(openaiService.createSummary('Content'))
        .rejects.toThrowError(OpenAIError);
    });
  });

  describe('Singleton Management', () => {
    it('should throw if getting instance before initialization', () => {
      OpenAIService.resetForTesting();
      expect(() => OpenAIService.getInstance(null as any))
        .toThrow('OpenAIService not initialized');
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = OpenAIService.getInstance(container);
      const instance2 = OpenAIService.getInstance(container);
      expect(instance1).toBe(instance2);
    });
  });
}); 