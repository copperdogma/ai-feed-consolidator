import { OpenAIService, SummaryResponse } from './openai';
import { FeedItem, ProcessedFeedItem } from '../types/feed';
import { DurationExtractor, ContentMetadata } from './duration-extractor';

export class ContentProcessingError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}

interface ProcessedContent {
  summary: string;
  contentType: string;
  timeSensitive: boolean;
  requiredBackground: string[];
  consumptionTime: {
    minutes: number;
    type: string;
  };
}

/**
 * Service for processing and analyzing feed content
 */
export class ContentProcessor {
  constructor(private openai: OpenAIService) {}

  /**
   * Process a feed item to extract key information
   */
  async processFeedItem(feedItem: FeedItem): Promise<ProcessedFeedItem> {
    try {
      const content = this.extractContent(feedItem);
      if (!content || content.trim() === '') {
        throw new ContentProcessingError('No content available for processing');
      }

      try {
        const summary = await this.openai.createSummary(content);
        return {
          ...feedItem,
          ...summary,
          processedAt: new Date(),
        };
      } catch (error) {
        throw new ContentProcessingError('Failed to generate summary', error);
      }
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
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate content metadata for consumption time estimation
   */
  private calculateContentMetadata(item: FeedItem): ContentMetadata {
    // If we have YouTube metadata, use that
    if (item.metadata?.youtube?.duration) {
      return DurationExtractor.fromYouTube({
        duration: item.metadata.youtube.duration
      });
    }

    // Otherwise treat as article
    return DurationExtractor.fromArticle({
      content: this.extractContent(item)
    });
  }

  /**
   * Calculate consumption time based on content metadata
   */
  private calculateConsumptionTime(metadata: ContentMetadata): { minutes: number; type: string } {
    const WORDS_PER_MINUTE = 250; // Average reading speed

    switch (metadata.type) {
      case 'article':
        if (!metadata.wordCount) {
          throw new ContentProcessingError('Word count required for articles');
        }
        return {
          minutes: Math.ceil(metadata.wordCount / WORDS_PER_MINUTE),
          type: 'read'
        };

      case 'video':
      case 'audio':
        if (!metadata.duration) {
          throw new ContentProcessingError('Duration required for video/audio');
        }
        return {
          minutes: Math.ceil(metadata.duration.seconds / 60),
          type: metadata.type === 'video' ? 'watch' : 'listen'
        };

      case 'mixed':
        if (!metadata.wordCount || !metadata.duration) {
          throw new ContentProcessingError('Both word count and duration required for mixed content');
        }
        return {
          minutes: Math.ceil((metadata.wordCount / WORDS_PER_MINUTE) + (metadata.duration.seconds / 60)),
          type: 'mixed'
        };

      default:
        throw new ContentProcessingError(`Unknown content type: ${metadata.type}`);
    }
  }
} 