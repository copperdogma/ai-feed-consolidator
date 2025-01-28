import { ProcessedFeedItem, FeedItem } from '../types/feed';

/**
 * Transform raw feed item data into the expected ProcessedFeedItem format
 */
export const transformFeedItem = (item: any): ProcessedFeedItem => {
  // Ensure required fields exist
  if (!item.id || !item.title || !item.url) {
    throw new Error('Invalid feed item: missing required fields');
  }

  return {
    id: item.id,
    sourceId: item.sourceId || item.source_id || '',
    externalId: item.externalId || item.external_id || item.id,
    title: item.title,
    content: item.content || '',
    summary: item.summary || item.processed_summary || '',
    url: item.url,
    publishedAt: new Date(item.publishedAt || item.published_at),
    source: {
      id: item.source?.id || '',
      name: item.source?.name || item.origin?.title || 'Unknown Source',
      platform: item.source?.platform || item.origin?.platform || 'rss',
      url: item.source?.url || item.origin?.htmlUrl || ''
    },
    media: Array.isArray(item.media) ? item.media : [],
    topics: Array.isArray(item.topics) ? item.topics : [],
    feedConfigId: item.feedConfigId || item.feed_config_id,
    content_type: item.content_type || 'news',
    time_sensitive: item.time_sensitive || false,
    requires_background: Array.isArray(item.requires_background) ? item.requires_background : [],
    consumption_time: {
      minutes: item.consumption_time_minutes || item.consumption_time?.minutes || 5,
      type: item.consumption_type || item.consumption_time?.type || 'read'
    },
    processedAt: new Date(item.processedAt || item.processed_at || Date.now())
  };
};

/**
 * Validate and transform an array of feed items
 */
export const transformFeedItems = (items: any[]): ProcessedFeedItem[] => {
  return items.map(item => transformFeedItem(item));
}; 