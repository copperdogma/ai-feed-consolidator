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
  metadata?: Record<string, unknown>; // Additional platform-specific data
}

/**
 * Interface for normalized content after processing
 */
export interface ProcessedFeedItem extends FeedItem {
  processedAt: Date;            // When the item was processed
  keyPoints?: string[];         // Extracted key points
  summary?: string;             // Generated summary
  topics?: string[];            // Detected/assigned topics
  sentiment?: number;           // Sentiment score (-1 to 1)
  readingTime?: number;         // Estimated reading time in minutes
} 