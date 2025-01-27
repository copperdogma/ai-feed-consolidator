import { Pool } from 'pg';
import Parser from 'rss-parser';
import { logger } from '../logger';
import { FeedItem, FeedMedia, FeedSource } from '../types/feed';
import { User } from './db';

// Extend the Parser type to include the parse method
interface ExtendedParser {
  parse(text: string): Promise<Parser.Output<{ [key: string]: any }>>;
  parseURL(url: string): Promise<Parser.Output<{ [key: string]: any }>>;
}

class ExtendedRSSParser implements ExtendedParser {
  private parser: Parser;

  constructor(options?: Parser.ParserOptions<any, any>) {
    this.parser = new Parser(options);
  }

  parse(text: string): Promise<Parser.Output<{ [key: string]: any }>> {
    return this.parser.parseString(text);
  }

  parseURL(url: string): Promise<Parser.Output<{ [key: string]: any }>> {
    return this.parser.parseURL(url);
  }
}

export class RSSError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'RSSError';
  }
}

interface RSSFeedConfig {
  id: number;
  userId: number;
  feedUrl: string;
  title?: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  lastFetchedAt?: Date;
  errorCount: number;
  isActive: boolean;
  fetchIntervalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

type RSSFeedConfigUpdate = {
  title?: string;
  description?: string;
  isActive?: boolean;
  fetchIntervalMinutes?: number;
}

export class RSSService {
  private readonly parser: ExtendedParser;
  
  constructor(private readonly pool: Pool) {
    this.parser = new ExtendedRSSParser({
      timeout: 10000, // 10 second timeout
      maxRedirects: 3,
      headers: {
        'User-Agent': 'AI Feed Consolidator/1.0'
      }
    });
  }

  /**
   * Add a new RSS feed for a user
   */
  async addFeed(userId: number, feedUrl: string): Promise<RSSFeedConfig> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // First verify the user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw new RSSError(`User ${userId} not found`, undefined, false);
      }

      // Then validate the feed
      const feed = await this.validateFeed(feedUrl);
      
      // Insert the feed config
      const result = await client.query<RSSFeedConfig>(
        `INSERT INTO feed_configs (
          user_id, feed_url, title, description, site_url, 
          icon_url, fetch_interval_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, user_id as "userId", feed_url as "feedUrl", title,
                  description, site_url as "siteUrl", icon_url as "iconUrl",
                  last_fetched_at as "lastFetchedAt", error_count as "errorCount",
                  is_active as "isActive", fetch_interval_minutes as "fetchIntervalMinutes",
                  created_at as "createdAt", updated_at as "updatedAt"`,
        [
          userId,
          feedUrl,
          feed.title,
          feed.description,
          feed.link,
          feed.image?.url,
          60 // Default to 1 hour interval
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Internal method to fetch feeds with proper column aliasing
   */
  private async fetchFeeds(whereClause = '', params: any[] = []): Promise<RSSFeedConfig[]> {
    const result = await this.pool.query<RSSFeedConfig>(
      `SELECT id, user_id as "userId", feed_url as "feedUrl", title,
              description, site_url as "siteUrl", icon_url as "iconUrl",
              last_fetched_at as "lastFetchedAt", error_count as "errorCount",
              is_active as "isActive", fetch_interval_minutes as "fetchIntervalMinutes",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM feed_configs
       ${whereClause}`,
      params
    );

    // Verify that required fields are present
    for (const feed of result.rows) {
      if (!feed.feedUrl) {
        logger.warn({ feedId: feed.id }, 'Feed URL is missing in database');
      }
    }

    return result.rows;
  }

  /**
   * Get a specific feed for a user
   */
  async getFeed(userId: number, feedId: number): Promise<RSSFeedConfig | null> {
    const feeds = await this.fetchFeeds('WHERE user_id = $1 AND id = $2', [userId, feedId]);
    return feeds[0] || null;
  }

  /**
   * Get all active feeds for a user
   */
  async getUserFeeds(userId: number): Promise<RSSFeedConfig[]> {
    return this.fetchFeeds('WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  }

  /**
   * Update feed configuration
   */
  async updateFeed(
    userId: number, 
    feedId: number, 
    updates: RSSFeedConfigUpdate
  ): Promise<RSSFeedConfig> {
    // Map camelCase to snake_case for column names
    const columnMap = {
      title: 'title',
      description: 'description',
      isActive: 'is_active',
      fetchIntervalMinutes: 'fetch_interval_minutes'
    } as const;

    const setClauses: string[] = [];
    const values: (string | number | boolean)[] = [userId, feedId];
    let paramIndex = 3;

    for (const [key, column] of Object.entries(columnMap)) {
      const value = updates[key as keyof RSSFeedConfigUpdate];
      if (value !== undefined) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new RSSError('No valid updates provided', undefined, false);
    }

    const result = await this.pool.query<RSSFeedConfig>(
      `UPDATE feed_configs 
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = $2
       RETURNING id, user_id as "userId", feed_url as "feedUrl", title,
                 description, site_url as "siteUrl", icon_url as "iconUrl",
                 last_fetched_at as "lastFetchedAt", error_count as "errorCount",
                 is_active as "isActive", fetch_interval_minutes as "fetchIntervalMinutes",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new RSSError('Feed not found', undefined, false);
    }

    return result.rows[0];
  }

  /**
   * Delete a feed
   */
  async deleteFeed(userId: number, feedId: number): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM feed_configs WHERE user_id = $1 AND id = $2',
      [userId, feedId]
    );

    if (result.rowCount === 0) {
      throw new RSSError('Feed not found', undefined, false);
    }
  }

  /**
   * Validate a feed URL and return basic feed info
   */
  private async validateFeed(feedUrl: string) {
    try {
      return await this.parser.parseURL(feedUrl);
    } catch (error) {
      throw new RSSError(
        `Invalid feed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
        false
      );
    }
  }

  /**
   * Poll feeds that are due for update
   */
  async pollFeeds(): Promise<void> {
    const feeds = await this.fetchFeeds(
      `WHERE is_active = true
       AND (
         last_fetched_at IS NULL
         OR last_fetched_at < NOW() - (fetch_interval_minutes || ' minutes')::interval
       )`
    );

    for (const feed of feeds) {
      if (!feed.feedUrl) {
        logger.warn({ feedId: feed.id }, 'Skipping feed with missing URL');
        continue;
      }

      try {
        await this.pollFeed(feed);
        
        // Reset error count on success
        await this.pool.query(
          `UPDATE feed_configs 
           SET error_count = 0, 
               last_fetched_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [feed.id]
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorCause = error instanceof Error && error.cause ? error.cause : undefined;
        
        logger.error(
          { 
            error: errorMessage,
            stack: errorStack,
            cause: errorCause,
            feedId: feed.id,
            feedUrl: feed.feedUrl,
            isRetryable: error instanceof RSSError ? error.isRetryable : undefined
          },
          'Error polling feed'
        );

        // Increment error count
        await this.pool.query(
          `UPDATE feed_configs 
           SET error_count = error_count + 1,
               last_fetched_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [feed.id]
        );
      }
    }
  }

  /**
   * Poll a single feed for updates
   */
  async pollFeed(feed: RSSFeedConfig): Promise<void> {
    try {
      if (!feed.feedUrl) {
        throw new RSSError('Feed URL is missing', undefined, false);
      }

      let text: string;
      try {
        const response = await fetch(feed.feedUrl);
        if (!response.ok) {
          throw new RSSError(`Feed returned status ${response.status}: ${response.statusText}`);
        }
        text = await response.text();
        if (!text) {
          throw new RSSError('Feed returned empty response');
        }
        logger.info({ 
          feedId: feed.id, 
          contentLength: text.length,
          contentType: response.headers.get('content-type')
        }, 'Feed content fetched');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        throw new RSSError(
          `Failed to fetch feed: ${errorMessage}`,
          { error, stack: errorStack }
        );
      }

      const parsedFeed = await this.parser.parse(text);
      
      if (!parsedFeed) {
        throw new RSSError('Failed to parse feed - no content returned');
      }

      if (!parsedFeed.items) {
        throw new RSSError('Feed contains no items array');
      }

      logger.info({ 
        feedId: feed.id, 
        itemCount: parsedFeed.items.length,
        feedTitle: parsedFeed.title
      }, 'Feed parsed successfully');
      
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        for (const item of parsedFeed.items) {
          if (!item.guid && !item.link) {
            logger.warn({ 
              feedId: feed.id,
              itemTitle: item.title
            }, 'Skipping item with no ID');
            continue;
          }

          // Skip if we already have this item
          const existing = await client.query(
            `SELECT id FROM feed_items 
             WHERE source_type = 'rss'
             AND source_id = $1`,
            [item.guid || item.link]
          );

          if (existing.rows.length > 0) {
            logger.info({
              feedId: feed.id,
              itemId: item.guid || item.link
            }, 'Item already exists, skipping');
            continue;
          }

          // Insert new item
          const result = await client.query(
            `INSERT INTO feed_items (
              source_id, source_type, title, author, content,
              summary, url, published_at, raw_metadata, feed_config_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [
              item.guid || item.link,
              'rss',
              item.title || 'Untitled',
              item.creator || item.author,
              item.content || item.contentSnippet || '',
              item.contentSnippet || '',
              item.link || '',
              item.isoDate ? new Date(item.isoDate) : new Date(),
              JSON.stringify({
                categories: item.categories || [],
                enclosures: item.enclosures || []
              }),
              feed.id
            ]
          );

          // Create initial item state for the feed owner
          await client.query(
            `INSERT INTO item_states (user_id, feed_item_id, is_read, is_saved)
             VALUES ($1, $2, false, false)
             ON CONFLICT (user_id, feed_item_id) DO NOTHING`,
            [feed.userId, result.rows[0].id]
          );

          logger.info({ 
            feedId: feed.id, 
            itemId: result.rows[0].id,
            title: item.title
          }, 'New feed item added');
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          feedId: feed.id,
          feedUrl: feed.feedUrl,
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error processing feed items');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        error: message,
        feedId: feed.id,
        feedUrl: feed.feedUrl
      }, 'Error polling feed');
      throw new RSSError(`Failed to poll feed: ${message}`, error);
    }
  }
} 