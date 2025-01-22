import { describe, it, expect } from 'vitest';
import { FeedlyNormalizer } from '../feedly';
import { loadFeedlySampleData } from '../../__tests__/helpers/load-fixtures';

describe('FeedlyNormalizer', () => {
  it('should normalize a Feedly entry to common format', async () => {
    const sampleData = await loadFeedlySampleData();
    const entry = sampleData[0]; // Use first item from sample data
    
    const normalized = FeedlyNormalizer.normalize(entry);

    // Test required fields
    expect(normalized.id).toBe(`feedly_${entry.id}`);
    expect(normalized.sourceId).toBe('feedly');
    expect(normalized.externalId).toBe(entry.id);
    expect(normalized.title).toBe(entry.title);
    expect(normalized.publishedAt).toBeInstanceOf(Date);
    expect(normalized.publishedAt.getTime()).toBe(entry.published);

    // Test source normalization
    expect(normalized.source).toEqual({
      id: entry.origin?.streamId || '',
      name: entry.origin?.title || '',
      url: entry.origin?.htmlUrl || '',
      platform: 'feedly'
    });

    // Test content fields
    if (entry.content) {
      expect(normalized.content).toBe(entry.content.content);
    }
    if (entry.summary) {
      expect(normalized.summary).toBe(entry.summary.content);
    }

    // Test media normalization
    if (entry.visual) {
      expect(normalized.media).toHaveLength(1);
      expect(normalized.media![0]).toEqual({
        type: 'image',
        url: entry.visual.url,
        width: entry.visual.width,
        height: entry.visual.height,
        contentType: entry.visual.contentType
      });
    }

    // Test engagement metrics
    if (entry.engagement) {
      expect(normalized.engagement).toBeDefined();
      expect(normalized.engagement!.raw).toBe(entry.engagement);
      expect(normalized.engagement!.score).toBe(entry.engagementRate || 0);
    }

    // Test metadata
    expect(normalized.metadata).toBeDefined();
    expect(normalized.metadata!.language).toBe(entry.language);
    expect(normalized.metadata!.readTime).toBe(entry.readTime);
    expect(normalized.metadata!.categories).toEqual(entry.categories);
    expect(normalized.metadata!.tags).toEqual(entry.tags);
  });

  it('should normalize multiple entries', async () => {
    const sampleData = await loadFeedlySampleData();
    const normalized = FeedlyNormalizer.normalizeMany(sampleData);

    expect(normalized).toHaveLength(sampleData.length);
    normalized.forEach((item, index) => {
      expect(item.id).toBe(`feedly_${sampleData[index].id}`);
      expect(item.sourceId).toBe('feedly');
    });
  });
}); 