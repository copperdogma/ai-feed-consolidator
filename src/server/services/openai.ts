import { OpenAI } from 'openai';
import { config } from '../config';
import { Pool } from 'pg';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';
import { TransactionManager } from './transaction-manager';

export class OpenAIError extends Error {
  constructor(message: string, public readonly cause?: unknown, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export interface SummaryResponse {
  summary: string;
  content_type: 'technical' | 'news';
  time_sensitive: boolean;
  consumption_time: number;
}

export class OpenAIService {
  private client: OpenAI;
  private pool: Pool;
  private transactionManager: TransactionManager;
  private static instance: OpenAIService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    this.pool = serviceContainer.getPool();
    this.transactionManager = serviceContainer.getService('transactionManager') as TransactionManager;

    if (!config.openai?.apiKey) {
      throw new OpenAIError('OpenAI API key is not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      dangerouslyAllowBrowser: process.env.NODE_ENV === 'test' // Allow browser environment in tests
    });
  }

  public static initialize(serviceContainer: IServiceContainer): void {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService(serviceContainer);
    }
  }

  public static getInstance(serviceContainer: IServiceContainer): OpenAIService {
    if (!OpenAIService.instance) {
      if (!serviceContainer) {
        throw new Error('OpenAIService not initialized');
      }
      OpenAIService.instance = new OpenAIService(serviceContainer);
    }
    return OpenAIService.instance;
  }

  public static resetForTesting(): void {
    OpenAIService.instance = null;
  }

  async createSummary(content: string): Promise<SummaryResponse> {
    if (!content) {
      throw new OpenAIError('Empty content provided');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that analyzes and summarizes content.
            Return your response as a JSON object with the following structure:
            {
              "summary": "Brief summary of the content",
              "content_type": "technical" or "news",
              "time_sensitive": boolean indicating if the content is time-sensitive,
              "consumption_time": estimated reading time in minutes
            }`
          },
          {
            role: 'user',
            content: `Please analyze and summarize the following content:\n\n${content}`
          }
        ]
      });

      if (!response.choices || response.choices.length === 0) {
        throw new OpenAIError('Empty response from OpenAI');
      }

      const choice = response.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new OpenAIError('Empty response from OpenAI');
      }

      try {
        const parsedResponse = JSON.parse(choice.message.content.trim());
        return parsedResponse;
      } catch (error) {
        throw new OpenAIError('Failed to parse OpenAI response');
      }
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      
      // Check for specific OpenAI errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key')) {
          throw new OpenAIError(error.message, error);
        } else if (message.includes('empty response') || !error.message) {
          throw new OpenAIError('Empty response from OpenAI', error);
        }
      }
      
      throw new OpenAIError('Failed to generate summary', error);
    }
  }
} 