import { RSSFetchError } from '../errors/rss-fetch.error';
import { LocalFeedItem } from './rss/types';
import { logger } from '../utils/logger';
import Parser from 'rss-parser';

interface Feed {
  title?: string;
  description?: string;
  link?: string;
  items: LocalFeedItem[];
}

export class FeedFetcher {
  private parser: Parser;
  private readonly timeout = 30000; // 30 seconds

  constructor() {
    this.parser = new Parser({
      timeout: this.timeout,
      customFields: {
        item: ['guid', 'content:encoded', 'dc:creator']
      }
    });
  }

  async fetchAndParseFeed(url: string): Promise<Feed> {
    try {
      logger.debug({ url }, 'Fetching feed');
      const feed = await this.parser.parseURL(url);

      if (!feed) {
        throw new RSSFetchError('Feed not found', 'PARSE_ERROR');
      }

      const items = feed.items.map(item => ({
        guid: item.guid || item.id || item.link || '',
        title: item.title || '',
        url: item.link || '',
        description: item.description || '',
        content: item['content:encoded'] || item.content || '',
        author: item['dc:creator'] || item.creator || item.author || '',
        categories: item.categories || [],
        published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
        feed_config_id: 0 // Will be set by the repository
      }));

      return {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        items
      };

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new RSSFetchError('Feed fetch timeout', 'TIMEOUT');
        }
        if (error.message.includes('status code')) {
          throw new RSSFetchError(`HTTP error: ${error.message}`, 'HTTP_ERROR');
        }
        throw new RSSFetchError(error.message, 'NETWORK_ERROR');
      }
      throw new RSSFetchError('Unknown error during feed fetch', 'NETWORK_ERROR');
    }
  }
} 