import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIService, OpenAIError } from '../openai';
import { config } from '../../config';

describe('OpenAIService', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    // Ensure we have an API key for testing
    if (!config.openai?.apiKey) {
      throw new Error('OPENAI_API_KEY must be set in environment for tests');
    }
    openaiService = new OpenAIService();
  });

  it('should successfully extract points from simple text', async () => {
    const testContent = `
      The new iPhone 15 was announced today. 
      It features a better camera with 48MP resolution. 
      Battery life has been improved by 20%. 
      Prices start at $799.
    `;

    const points = await openaiService.extractCorePoints(testContent);

    expect(points).toBeDefined();
    expect(points.length).toBeGreaterThan(0);
    expect(points.some(point => point.toLowerCase().includes('iphone'))).toBe(true);
  });

  it('should handle empty content gracefully', async () => {
    await expect(openaiService.extractCorePoints('')).rejects.toThrow(OpenAIError);
  });
}); 