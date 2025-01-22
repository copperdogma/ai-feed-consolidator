import { OpenAIService } from './openai';
import { FeedItem } from '../types/feed';

export class ContentProcessingError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}

interface ProcessedContent {
  keyPoints: string[];
  summary?: string;
  topics?: string[];
  readingTimeMinutes?: number;
}

/**
 * Service for processing and analyzing feed content
 */
export class ContentProcessor {
  constructor(private openai: OpenAIService) {}

  /**
   * Process a feed item to extract key information
   */
  async processFeedItem(item: FeedItem): Promise<ProcessedContent> {
    try {
      // Get the main content, fallback to summary if content not available
      const content = this.extractContent(item);
      if (!content) {
        throw new ContentProcessingError('No content available for processing');
      }

      // Extract key points using OpenAI
      const keyPoints = await this.openai.extractCorePoints(content);

      // TODO: Add text summarization in next iteration
      // TODO: Add topic extraction in next iteration
      
      return {
        keyPoints,
        readingTimeMinutes: this.estimateReadingTime(content)
      };
    } catch (error) {
      if (error instanceof ContentProcessingError) {
        throw error;
      }
      throw new ContentProcessingError('Failed to process feed item', error);
    }
  }

  /**
   * Extract the main content from a feed item
   */
  private extractContent(item: FeedItem): string {
    // Try to get the full content first
    if (item.content) {
      return this.cleanContent(item.content);
    }

    // Fall back to summary if available
    if (item.summary) {
      return this.cleanContent(item.summary);
    }

    // If we have a title, use that as a last resort
    if (item.title) {
      return item.title;
    }

    return '';
  }

  /**
   * Clean content by removing HTML tags and normalizing whitespace
   */
  private cleanContent(content: string): string {
    return content
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Replace multiple whitespace with single space
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();
  }

  /**
   * Estimate reading time in minutes
   */
  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
} 