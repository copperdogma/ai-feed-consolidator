import { OpenAI } from 'openai';
import { config } from '../config';

export class OpenAIError extends Error {
  constructor(message: string, public readonly cause?: unknown, public readonly details?: Record<string, unknown>) {
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
2. Determine the content type (technical, news, analysis, tutorial, entertainment).
3. Assess if the content is time-sensitive (true/false).
4. List any required background knowledge as an array of strings.
5. Estimate consumption time in minutes and type (read/watch/listen).

Respond in JSON format:
{
  "summary": "string",
  "content_type": "technical|news|analysis|tutorial|entertainment",
  "time_sensitive": boolean,
  "requires_background": ["string"],
  "consumption_time": {
    "minutes": number,
    "type": "read|watch|listen"
  }
}`
          },
          {
            role: 'user',
            content
          }
        ],
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return response as SummaryResponse;
    } catch (error) {
      throw new OpenAIError('Failed to generate summary', error);
    }
  }
} 