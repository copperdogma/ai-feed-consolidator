import { ServiceContainer } from '../service-container';
import { Pool } from 'pg';
import { RSSService } from './rss-service';
import { RSSFetcher } from './rss-fetcher';
import { RSSParser } from './rss-parser';
import { FeedRepository } from './feed-repository';
import { KijijiHandler } from './kijiji-handler';

/**
 * Register all RSS-related services with the container
 */
export function registerRSSServices(container: ServiceContainer): void {
  // Register individual services
  container.registerFactory('rssFetcher', () => {
    return new RSSFetcher();
  });

  container.registerFactory('rssParser', () => {
    return new RSSParser();
  });

  container.registerFactory('feedRepository', (container) => {
    const pool = container.getService<Pool>('pool');
    return new FeedRepository(container);
  });

  container.registerFactory('kijijiHandler', () => {
    return new KijijiHandler();
  });

  // Register the main RSS service that orchestrates the others
  container.registerFactory('rssService', (container) => {
    return new RSSService(container);
  });
}

// Re-export types and classes
export { RSSService } from './rss-service';
export { RSSFetcher } from './rss-fetcher';
export { RSSParser } from './rss-parser';
export { FeedRepository } from './feed-repository';
export type { RSSFeedConfig, LocalFeedItem } from './feed-repository'; 