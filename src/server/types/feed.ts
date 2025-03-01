/**
 * Common interfaces for feed items across different sources
 */

export type Platform = 'youtube' | 'mastodon' | 'rss';
export type ContentType = 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
export type ConsumptionType = 'read' | 'watch' | 'listen';

/**
 * Represents a source/origin of a feed item
 */
export interface FeedSource {
  id: string;           // Unique identifier for the source
  name: string;         // Display name of the source
  url: string;         // URL to the source
  platform: Platform;    // Platform identifier
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
  thumbnailUrl?: string;
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
  feedConfigId?: number;
  sourceUrl?: string;
  imageUrl?: string;
  engagement?: {
    score: number;
    raw: number;
  };
  metadata?: {
    youtube?: {
      duration?: string;
    };
    tags?: Array<{ id: string }>;
  };
  // Processed content fields
  processedSummary?: string;
  contentType?: ContentType;
  timeSensitive?: boolean;
  requiredBackground?: string[];
  consumptionTime?: {
    minutes: number;
    type: ConsumptionType;
  };
}

/**
 * Interface for normalized content after processing
 */
export interface ProcessedFeedItem extends FeedItem {
  processedAt: Date;            // When the item was processed
  content_type: ContentType;    // Type of content
  time_sensitive: boolean;      // Whether the content is time-sensitive
  requires_background: string[]; // Required background knowledge
  consumption_time: {           // Time to consume the content
    minutes: number;            // Duration in minutes
    type: ConsumptionType;      // Type of consumption
  };
  summary: string;             // Generated summary
  id: string;
  title: string;
  source: FeedSource & {       // Merge with base interface
    platform: Platform;
    url?: string;
  };
}

/**
 * Interface for feed health records
 */
export interface FeedHealth {
  feed_config_id: number;
  last_check_at: Date;
  consecutive_failures: number;
  last_error_category: string | null;
  last_error_detail: string | null;
  is_permanently_invalid: boolean;
  requires_special_handling: boolean;
  special_handler_type: string | null;
  created_at: Date;
  updated_at: Date;
} 