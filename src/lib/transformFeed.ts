import { ProcessedFeedItem, FeedItem, FeedSource, Platform, MediaItem } from '../types/feed';

/**
 * Maps a raw source object to our standardized FeedSource format
 */
const transformSource = (rawSource: any): FeedSource => {
  // Handle different source formats
  if (rawSource?.platform) {
    // Already in our format
    return {
      id: rawSource.id || '',
      name: rawSource.name || 'Unknown Source',
      platform: rawSource.platform as Platform,
      url: rawSource.url || ''
    };
  }

  if (rawSource?.origin) {
    // Handle RSS origin format
    return {
      id: rawSource.origin.streamId || '',
      name: rawSource.origin.title || 'Unknown Source',
      platform: 'rss',
      url: rawSource.origin.htmlUrl || ''
    };
  }

  // Default source object
  return {
    id: '',
    name: 'Unknown Source',
    platform: 'rss',
    url: ''
  };
};

/**
 * Transform raw feed item data into the expected ProcessedFeedItem format
 */
export const transformFeedItem = (item: any): ProcessedFeedItem => {
  // Ensure required fields exist
  if (!item.id || !item.title || !item.url) {
    throw new Error('Invalid feed item: missing required fields');
  }

  // Transform source first
  const source = transformSource(item.source || item.origin);

  return {
    id: item.id,
    sourceId: item.sourceId || item.source_id || '',
    externalId: item.externalId || item.external_id || item.id,
    title: item.title,
    content: item.content || '',
    summary: item.summary || item.processed_summary || '',
    url: item.url,
    publishedAt: new Date(item.publishedAt || item.published_at),
    source,
    media: Array.isArray(item.media) ? item.media.map((m: MediaItem) => ({
      type: m.type || 'unknown',
      url: m.url,
      width: m.width,
      height: m.height,
      contentType: m.contentType,
      thumbnailUrl: m.thumbnailUrl
    })) : [],
    topics: Array.isArray(item.topics) ? item.topics : [],
    feedConfigId: item.feedConfigId || item.feed_config_id,
    content_type: item.content_type || 'news',
    time_sensitive: item.time_sensitive || false,
    requires_background: Array.isArray(item.requires_background) ? item.requires_background : [],
    consumption_time: {
      minutes: item.consumption_time_minutes || item.consumption_time?.minutes || 5,
      type: item.consumption_type || item.consumption_time?.type || 'read'
    },
    processedAt: new Date(item.processedAt || item.processed_at || Date.now()),
    metadata: item.metadata || {}
  };
};

/**
 * Validate and transform an array of feed items
 */
export const transformFeedItems = (items: any[]): ProcessedFeedItem[] => {
  return items.map(item => transformFeedItem(item));
}; 