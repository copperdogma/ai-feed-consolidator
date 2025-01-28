export type Platform = 'youtube' | 'mastodon' | 'rss';

export interface FeedSource {
  id: string;
  name: string;
  platform: Platform;
  url: string;
}

export interface MediaItem {
  type: string;
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
  thumbnailUrl?: string;
}

export interface FeedItem {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  publishedAt: Date;
  source: FeedSource;
  media: MediaItem[];
  topics: string[];
  feedConfigId: number;
  metadata?: {
    youtube?: {
      duration?: string;
    };
    tags?: Array<{ id: string }>;
  };
}

export type ContentType = 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
export type ConsumptionType = 'read' | 'watch' | 'listen';

export interface ProcessedFeedItem extends FeedItem {
  summary: string;
  content_type: ContentType;
  time_sensitive: boolean;
  requires_background: string[];
  consumption_time: {
    minutes: number;
    type: ConsumptionType;
  };
  processedAt: Date;
} 