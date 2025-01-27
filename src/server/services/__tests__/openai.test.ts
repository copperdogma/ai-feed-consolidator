import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIService, OpenAIError } from '../openai';
import { config } from '../../config';

// Mock config
vi.mock('../../config', () => ({
  config: {
    openai: {
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
      maxTokens: 500,
    },
  },
}));

// Mock OpenAI API
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}));

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockOpenAI: any;

  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    service = new OpenAIService();
    mockOpenAI = (service as any).client;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createSummary', () => {
    it('should create a valid summary for technical content', async () => {
      const content = 'Technical article about React hooks and state management';
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'A guide to React hooks',
                topics: ['React', 'Hooks', 'State Management'],
                difficulty: 'intermediate',
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const result = await service.createSummary(content);

      expect(result).toEqual({
        summary: 'A guide to React hooks',
        topics: ['React', 'Hooks', 'State Management'],
        difficulty: 'intermediate',
      });
    });

    it('should create a valid summary for news content', async () => {
      const content = 'News article about tech industry trends';
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'Tech industry trends overview',
                topics: ['Technology', 'Industry', 'Trends'],
                difficulty: 'beginner',
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

      const result = await service.createSummary(content);

      expect(result).toEqual({
        summary: 'Tech industry trends overview',
        topics: ['Technology', 'Industry', 'Trends'],
        difficulty: 'beginner',
      });
    });

    it('should handle empty content gracefully', async () => {
      await expect(() => service.createSummary('')).rejects.toThrow(
        new OpenAIError('No content provided')
      );
    });

    it('should handle null content gracefully', async () => {
      await expect(() => service.createSummary(null as unknown as string)).rejects.toThrow(
        new OpenAIError('No content provided')
      );
    });

    it('should handle undefined content gracefully', async () => {
      await expect(() => service.createSummary(undefined as unknown as string)).rejects.toThrow(
        new OpenAIError('No content provided')
      );
    });

    it('should handle invalid JSON response', async () => {
      const content = 'Some content';
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON'
            }
          }
        ]
      };
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

      await expect(service.createSummary(content)).rejects.toThrow('Failed to generate summary');
    });

    it('should handle missing response content', async () => {
      const content = 'Some content';
      const mockResponse = {
        choices: []
      };
      mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

      await expect(service.createSummary(content)).rejects.toThrow('Failed to generate summary');
    });
  });
}); 