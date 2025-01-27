export interface FeedSource {
  id: string;
  name: string;
  platform: string;
  url: string;
}

export interface MediaItem {
  type: string;
  url: string;
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
  };
}

export interface ProcessedFeedItem extends FeedItem {
  summary: string;
  content_type: 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
  time_sensitive: boolean;
  requires_background: string[];
  consumption_time: {
    minutes: number;
    type: 'read' | 'watch' | 'listen';
  };
  processedAt: Date;
} 