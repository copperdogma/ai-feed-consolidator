import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Pool, PoolClient } from 'pg';
import { RSSService } from '../../rss';
import { config } from '../../../config';
import { User } from '../../../types/auth';
import { createTestUser, cleanupDatabase } from '../../../__tests__/setup';
import Parser from 'rss-parser';

describe('RSSService Integration', () => {
  let pool: Pool;
  let rssService: RSSService;
  let testUserId: number;
  let client: PoolClient;

  const mockFeedContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test feed</description>
    <link>https://example.com</link>
    <item>
      <title>Test Item 1</title>
      <description>Test description 1</description>
      <link>https://example.com/1</link>
      <guid>1</guid>
      <isoDate>2024-01-23T12:00:00.000Z</isoDate>
      <contentSnippet>Test description 1</contentSnippet>
    </item>
    <item>
      <title>Test Item 2</title>
      <description>Test description 2</description>
      <link>https://example.com/2</link>
      <guid>2</guid>
      <isoDate>2024-01-23T13:00:00.000Z</isoDate>
      <contentSnippet>Test description 2</contentSnippet>
    </item>
  </channel>
</rss>`;

  beforeAll(async () => {
    // Mock global fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://example.com/feed.xml') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockFeedContent),
          headers: new Headers({
            'content-type': 'application/rss+xml'
          })
        });
      }
      return Promise.reject(new Error(`Feed returned status 404`));
    });

    // Mock Parser
    vi.mock('rss-parser', () => {
      return {
        default: vi.fn().mockImplementation(() => ({
          parseURL: vi.fn().mockImplementation((url: string) => {
            if (url === 'https://example.com/feed.xml') {
              return Promise.resolve({
                title: 'Test Feed',
                description: 'A test feed',
                link: 'https://example.com',
                items: [
                  {
                    title: 'Test Item 1',
                    description: 'Test description 1',
                    link: 'https://example.com/1',
                    guid: '1',
                    isoDate: '2024-01-23T12:00:00.000Z',
                    contentSnippet: 'Test description 1'
                  },
                  {
                    title: 'Test Item 2',
                    description: 'Test description 2',
                    link: 'https://example.com/2',
                    guid: '2',
                    isoDate: '2024-01-23T13:00:00.000Z',
                    contentSnippet: 'Test description 2'
                  }
                ]
              });
            }
            return Promise.reject(new Error('Feed not found'));
          })
        }))
      };
    });

    pool = new Pool({
      connectionString: config.database.url
    });
    client = await pool.connect();
    rssService = new RSSService(pool);
  });

  beforeEach(async () => {
    // Clean up feed data before each test
    await cleanupDatabase();
    const user = await createTestUser();
    testUserId = user.id;
    console.log('Created test user:', user);
    const verifiedUser = await pool.query<User>('SELECT * FROM users WHERE id = $1', [testUserId]);
    console.log('Verified test user exists:', verifiedUser.rows[0]);
    const finalCheck = await pool.query<User>('SELECT * FROM users WHERE id = $1', [testUserId]);
    console.log('Final user verification successful:', finalCheck.rows[0]);
  });

  afterAll(async () => {
    console.log('Database cleaned');
    await cleanupDatabase();
    console.log('Releasing client and ending pool...');
    client.release();
    await pool.end();
    console.log('Cleanup complete');
  });

  describe('Database Schema', () => {
    it('should have all required columns in feed_items table', async () => {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'feed_items'
      `);

      const columns = result.rows.map((row: { column_name: string }) => row.column_name);
      
      expect(columns).toContain('id');
      expect(columns).toContain('source_id');
      expect(columns).toContain('source_type');
      expect(columns).toContain('title');
      expect(columns).toContain('content');
      expect(columns).toContain('feed_config_id');
    });

    it('should have correct foreign key relationships', async () => {
      const result = await client.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'feed_items'
      `);

      const fkConstraints = result.rows;
      const feedConfigFk = fkConstraints.find((fk: { 
        column_name: string;
        foreign_table_name: string;
      }) => 
        fk.column_name === 'feed_config_id' && 
        fk.foreign_table_name === 'feed_configs'
      );

      expect(feedConfigFk).toBeTruthy();
    });

    it('should have correct database schema', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'feed_items'
      `);
      
      expect(result.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'feed_config_id',
            data_type: 'integer'
          })
        ])
      );
    });

    it('should enforce foreign key constraint', async () => {
      await expect(
        pool.query(`
          INSERT INTO feed_items (
            source_id,
            source_type,
            title,
            url,
            published_at,
            feed_config_id
          ) VALUES (
            'test-source-id',
            'feedly',
            'Test Title',
            'https://example.com/test',
            CURRENT_TIMESTAMP,
            999999
          )
        `)
      ).rejects.toThrow('violates foreign key constraint');
    });
  });

  describe('Feed Operations', () => {
    it('should add feed and poll items', async () => {
      // Verify user exists before attempting feed operations
      const userCheck = await pool.query<User>('SELECT * FROM users WHERE id = $1', [testUserId]);
      expect(userCheck.rows.length).toBe(1);
      console.log('Pre-operation user verification:', userCheck.rows[0]);

      // Add feed with retries
      let feed;
      let maxRetries = 3;
      let retryCount = 0;
      
      while (!feed && retryCount < maxRetries) {
        try {
          feed = await rssService.addFeed(testUserId, 'https://example.com/feed.xml');
          console.log('Feed added successfully:', feed);
        } catch (error) {
          console.error(`Feed creation attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }

      if (!feed) {
        throw new Error('Failed to create feed after retries');
      }

      expect(feed).toBeDefined();
      expect(feed.feedUrl).toBe('https://example.com/feed.xml');
      expect(feed.userId).toBe(testUserId);

      // Poll feed with retries
      let pollSuccess = false;
      retryCount = 0;
      
      while (!pollSuccess && retryCount < maxRetries) {
        try {
          await rssService.pollFeed(feed);
          pollSuccess = true;
          console.log('Feed polled successfully');
        } catch (error) {
          console.error(`Feed polling attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }

      // Verify feed items were created
      const result = await pool.query('SELECT COUNT(*) FROM feed_items WHERE feed_config_id = $1', [feed.id]);
      expect(parseInt(result.rows[0].count)).toBe(2); // We expect 2 items from our mock feed
      console.log('Feed items count:', result.rows[0].count);
    });

    it('should handle feed errors gracefully', async () => {
      await expect(rssService.addFeed(testUserId, 'https://invalid-url')).rejects.toThrow('Invalid feed URL');
    });

    it('should associate feed items with their feed config', async () => {
      const user = await createTestUser();
      const feed = await rssService.addFeed(user.id, 'https://example.com/feed.xml');
      
      // Poll the feed to create items
      await rssService.pollFeed(feed);

      // Check that items were created with the correct feed_config_id
      const result = await pool.query(
        'SELECT * FROM feed_items WHERE feed_config_id = $1',
        [feed.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].feed_config_id).toBe(feed.id);
    });
  });
});