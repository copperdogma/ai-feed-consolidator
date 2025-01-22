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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a precise content analyzer that extracts key points from text.
Your task is to identify 3-5 main points that capture the core message.

Guidelines:
- Focus on factual information and main insights
- Make each point clear and self-contained
- Keep points concise (10-15 words each)
- Avoid repetition and background information
- Use simple, direct language
- Number points for clarity

Format: "N. [Key point]"

Example:
1. New electric car model achieves 400-mile range on single charge
2. Manufacturing costs reduced 30% through automated assembly line
3. Pre-orders start next month with base price of $35,000`
          },
          {
            role: 'user',
            content: content,
          },
        ],
        temperature: 0.3, // Keep low temperature for consistent output
        max_tokens: 256, // Reduced from 500 since we need less with GPT-3.5
        presence_penalty: 0.1, // Slight penalty to prevent repetition
        frequency_penalty: 0.1, // Slight penalty to encourage diverse points
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new OpenAIError('No response received from OpenAI');
      }

      // Split the response into individual points and clean them up
      return result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          // Remove the number prefix (e.g., "1. " or "1) ")
          return line.replace(/^\d+[\.\)]?\s*/, '').trim();
        });
    } catch (error) {
      if (error instanceof Error) {
        throw new OpenAIError('Failed to extract core points', error);
      }
      throw new OpenAIError('An unknown error occurred while extracting core points');
    }
  }
} 