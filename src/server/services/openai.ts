import OpenAI from 'openai';
import { config } from '../config';

export class OpenAIError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    if (!config.openai?.apiKey) {
      throw new OpenAIError('OpenAI API key is not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: true // Required for testing with JSDOM
    });
  }

  /**
   * Extracts core points from the given text content
   * @param content The text content to analyze
   * @returns Array of core points extracted from the content
   */
  async extractCorePoints(content: string): Promise<string[]> {
    if (!content.trim()) {
      throw new OpenAIError('Content cannot be empty');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a precise content analyzer. Extract the key points from the given text in a clear, concise format.',
          },
          {
            role: 'user',
            content: content,
          },
        ],
        temperature: 0.3, // Lower temperature for more focused/consistent output
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new OpenAIError('No response received from OpenAI');
      }

      // Split the response into individual points
      return result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } catch (error) {
      if (error instanceof Error) {
        throw new OpenAIError('Failed to extract core points', error);
      }
      throw new OpenAIError('An unknown error occurred while extracting core points');
    }
  }
} 