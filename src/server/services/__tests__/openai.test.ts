import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService, OpenAIError } from '../openai';
import OpenAI from 'openai';

describe('OpenAIService', () => {
  describe('createSummary', () => {
    let openaiService: OpenAIService;

    beforeEach(() => {
      openaiService = new OpenAIService();
    });

    it('should create a valid summary for technical content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'A technical summary',
              content_type: 'technical',
              time_sensitive: false,
              requires_background: ['programming'],
              consumption_time: {
                type: 'read',
                minutes: 5
              }
            })
          }
        }]
      };

      vi.spyOn(openaiService['client'].chat.completions, 'create').mockResolvedValue(mockResponse as any);

      const result = await openaiService.createSummary('test content');
      expect(result.summary).toBe('A technical summary');
      expect(result.content_type).toBe('technical');
      expect(result.time_sensitive).toBe(false);
      expect(result.requires_background).toContain('programming');
      expect(result.consumption_time.type).toBe('read');
      expect(result.consumption_time.minutes).toBe(5);
    });

    it('should create a valid summary for news content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'A news summary',
              content_type: 'news',
              time_sensitive: true,
              requires_background: ['current events'],
              consumption_time: {
                type: 'read',
                minutes: 3
              }
            })
          }
        }]
      };

      vi.spyOn(openaiService['client'].chat.completions, 'create').mockResolvedValue(mockResponse as any);

      const result = await openaiService.createSummary('test content');
      expect(result.summary).toBe('A news summary');
      expect(result.content_type).toBe('news');
      expect(result.time_sensitive).toBe(true);
      expect(result.requires_background).toContain('current events');
      expect(result.consumption_time.type).toBe('read');
      expect(result.consumption_time.minutes).toBe(3);
    });

    it('should handle empty content gracefully', async () => {
      await expect(openaiService.createSummary('')).rejects.toThrow(OpenAIError);
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      vi.spyOn(openaiService['client'].chat.completions, 'create').mockResolvedValue(mockResponse as any);

      await expect(openaiService.createSummary('test content')).rejects.toThrow(OpenAIError);
    });

    it('should handle missing response content', async () => {
      vi.spyOn(openaiService['client'].chat.completions, 'create').mockResolvedValue({
        choices: []
      } as any);

      await expect(openaiService.createSummary('test content')).rejects.toThrow('No response from OpenAI');
    });
  });
}); 