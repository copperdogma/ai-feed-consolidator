import { OpenAI } from 'openai';
import { config } from '../config';

export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export interface SummaryResponse {
  summary: string;
  content_type: 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
  time_sensitive: boolean;
  requires_background: string[];
  consumption_time: {
    minutes: number;
    type: 'read' | 'watch' | 'listen';
  };
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    if (!config.openai?.apiKey) {
      throw new OpenAIError('OpenAI API key is not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test' // Allow browser environment in tests
    });
  }

  async createSummary(content: string): Promise<SummaryResponse> {
    if (!content) {
      throw new OpenAIError('No content provided');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a precise content analyzer that creates concise, informative summaries.

Guidelines:
1. Provide a 1-3 sentence summary that captures the essential information. Each sentence should be concise and focused.
2. Identify the content type (technical, news, analysis, tutorial, entertainment)
3. Determine if the content is time-sensitive (e.g. breaking news, price changes, product launches)
4. List required background knowledge as fundamental concepts (e.g. "machine learning" instead of "AI", "electric vehicles" instead of "EV market trends")
5. Estimate consumption time in minutes based on content length and complexity

Output Format:
{
  "summary": "Concise summary of the main points (max 3 sentences)",
  "content_type": "technical|news|analysis|tutorial|entertainment",
  "time_sensitive": true|false,
  "requires_background": ["fundamental concept 1", "fundamental concept 2"],
  "consumption_time": {
    "minutes": number,
    "type": "read|watch|listen"
  }
}

Remember:
- Keep summaries under 3 sentences
- Use fundamental concepts for background knowledge
- Be specific with technical terms (e.g. "machine learning" not "AI")`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new OpenAIError('No response from OpenAI');
      }

      try {
        return JSON.parse(responseContent) as SummaryResponse;
      } catch (err) {
        throw new OpenAIError('Failed to parse OpenAI response as JSON');
      }
    } catch (err) {
      if (err instanceof OpenAIError) {
        throw err;
      }
      throw new OpenAIError(`OpenAI API error: ${err}`);
    }
  }
} 