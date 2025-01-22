import { FeedItem, FeedMedia, FeedSource } from '../../types/feed';
import { FeedlyEntry } from '../feedly';

/**
 * Normalizes Feedly feed items into the common FeedItem format
 */
export class FeedlyNormalizer {
  /**
   * Convert a Feedly entry to our common FeedItem format
   */
  static normalize(entry: FeedlyEntry): FeedItem {
    return {
      id: `feedly_${entry.id}`,
      sourceId: 'feedly',
      externalId: entry.id,
      url: entry.canonicalUrl || entry.alternate?.[0]?.href || '',
      title: entry.title,
      content: entry.content?.content || entry.summary?.content || '',
      summary: entry.summary?.content,
      author: entry.author,
      publishedAt: new Date(entry.published),
      source: this.normalizeSource(entry),
      media: this.normalizeMedia(entry),
      topics: entry.keywords || [],
      engagement: entry.engagement ? {
        score: entry.engagementRate || 0,
        raw: entry.engagement,
      } : undefined,
      metadata: {
        language: entry.language,
        readTime: entry.readTime,
        fingerprint: entry.fingerprint,
        categories: entry.categories,
        tags: entry.tags,
      }
    };
  }

  /**
   * Convert a Feedly entry's source information
   */
  private static normalizeSource(entry: FeedlyEntry): FeedSource {
    return {
      id: entry.origin?.streamId || '',
      name: entry.origin?.title || '',
      url: entry.origin?.htmlUrl || '',
      platform: 'feedly'
    };
  }

  /**
   * Convert Feedly visual data to our media format
   */
  private static normalizeMedia(entry: FeedlyEntry): FeedMedia[] {
    const media: FeedMedia[] = [];
    
    if (entry.visual) {
      media.push({
        type: 'image',
        url: entry.visual.url,
        width: entry.visual.width,
        height: entry.visual.height,
        contentType: entry.visual.contentType
      });
    }

    return media;
  }

  /**
   * Normalize an array of Feedly entries
   */
  static normalizeMany(entries: FeedlyEntry[]): FeedItem[] {
    return entries.map(entry => this.normalize(entry));
  }
} 