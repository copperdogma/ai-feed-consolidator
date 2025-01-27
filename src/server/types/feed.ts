/**
 * Common interfaces for feed items across different sources
 */

/**
 * Represents a source/origin of a feed item
 */
export interface FeedSource {
  id: string;           // Unique identifier for the source
  name: string;         // Display name of the source
  url: string;         // URL to the source
  platform: string;    // Platform identifier (e.g., 'feedly', 'youtube', 'twitter')
}

/**
 * Represents media content (images, videos) associated with a feed item
 */
export interface FeedMedia {
  type: string;
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
}

/**
 * YouTube-specific metadata
 */
export interface YouTubeMetadata {
  duration: string;
}

/**
 * Common interface for feed items from any source
 */
export interface FeedItem {
  id: string;
  sourceId: string;
  externalId: string;
  url: string;
  title: string;
  content: string;
  summary?: string;
  author?: string;
  publishedAt: Date;
  source: FeedSource;
  media: FeedMedia[];
  topics: string[];
  feedConfigId?: number;  // Optional since not all feed items will have this
  engagement?: {
    score: number;
    raw: number;
  };
  metadata?: Record<string, any>;
  // Processed content fields
  processedSummary?: string;
  contentType?: 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
  timeSensitive?: boolean;
  requiredBackground?: string[];
  consumptionTime?: {
    minutes: number;
    type: 'read' | 'watch' | 'listen';
  };
}

/**
 * Interface for normalized content after processing
 */
export interface ProcessedFeedItem extends FeedItem {
  processedAt: Date;            // When the item was processed
  content_type: 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';  // Type of content
  time_sensitive: boolean;      // Whether the content is time-sensitive
  requires_background: string[]; // Required background knowledge
  consumption_time: {           // Time to consume the content
    minutes: number;            // Duration in minutes
    type: 'read' | 'watch' | 'listen';  // Type of consumption
  };
  summary: string;             // Generated summary
} 