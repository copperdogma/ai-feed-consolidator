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
  type: 'image' | 'video';
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
  id: string;                    // Unique identifier
  sourceId: string;              // ID of the source platform
  externalId: string;            // Original ID from the source platform
  url: string;                   // URL to the original content
  title: string;                 // Content title
  content: string;               // Full content (may be HTML)
  contentText?: string;          // Plain text version of content
  summary?: string;              // Brief summary
  author?: string;               // Content author
  publishedAt: Date;            // Publication date
  source: FeedSource;           // Source information
  media?: FeedMedia[];          // Associated media
  topics?: string[];            // Topic tags/categories
  engagement?: {                // Engagement metrics
    score: number;              // Normalized engagement score
    raw?: number;               // Raw engagement number
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };
  metadata?: {                  // Additional platform-specific data
    youtube?: YouTubeMetadata;
    language: string;
    readTime: number;
    fingerprint: string;
    categories: Array<{
      id: string;
      label: string;
    }>;
    tags: Array<{
      id: string;
      label: string;
    }>;
  };
  readingTime?: number;         // Estimated reading time in minutes
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