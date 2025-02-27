import { Pool } from 'pg';
import { TestDataFactory } from './factories';
import { EnhancedFeedValidator } from '../../server/services/feed-validator';
import { server } from './mock-server';
import { http, HttpResponse } from 'msw';
import { DatabaseStateManager } from './setup-test-db';

export interface SetupTestUserResult {
  userId: number;
  email: string;
  sessionToken: string;
}

export interface SetupTestFeedResult {
  userId: number;
  feedConfigId: number;
  items: any[];
}

/**
 * Helper to setup a complete test user with preferences and session
 */
export async function setupTestUser(
  factory: TestDataFactory,
  email = 'test@example.com'
): Promise<SetupTestUserResult> {
  // Create user and auth data
  const { user } = await factory.createAuthTestData();
  const session = await factory.createSession(user.id);
  
  return {
    userId: user.id,
    email: user.email,
    sessionToken: session.session_token
  };
}

/**
 * Helper to setup a feed with items and mock responses
 */
export async function setupTestFeed(
  factory: TestDataFactory,
  userId: number,
  numItems = 3,
  feedUrl = 'http://example.com/feed.xml'
): Promise<{ feedConfigId: number; items: any[] }> {
  console.log('Setting up test feed for user:', userId);
  
  try {
    // Create feed config first
    const feedConfig = await factory.createFeedConfig(userId, {
      feed_url: feedUrl,
      feed_type: 'rss',
      title: 'Test Feed',
      description: 'Test Feed Description',
      icon_url: 'http://example.com/icon.png',
      fetch_interval_minutes: 60,
      last_fetched_at: new Date()
    });
    console.log('Created feed config:', feedConfig.id);
    
    // Create feed items
    const items = [];
    for (let i = 0; i < numItems; i++) {
      const item = await factory.createFeedItem(feedConfig.id, {
        title: `Test Item ${i + 1}`,
        guid: `test-guid-${i + 1}`,
        url: `http://example.com/item-${i + 1}`,
        published_at: new Date()
      });
      items.push(item);
    }
    console.log('Created feed items:', items.length);
    
    return { feedConfigId: feedConfig.id, items };
  } catch (error) {
    console.error('Error in setupTestFeed:', error);
    throw error;
  }
}

/**
 * Helper to generate test RSS XML
 */
export function generateTestFeedXml(items: any[]): string {
  const itemsXml = items.map(item => `
    <item>
      <title>${item.title}</title>
      <link>${item.url}</link>
      <description>${item.description || item.summary || ''}</description>
      <pubDate>${item.published_at?.toUTCString() || new Date().toUTCString()}</pubDate>
      <guid>${item.guid}</guid>
      ${item.author ? `<author>${item.author}</author>` : ''}
    </item>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Test Feed</title>
        <link>http://example.com</link>
        <description>Test Description</description>
        ${itemsXml}
      </channel>
    </rss>`;
}

/**
 * Helper to verify feed validation results
 */
export async function verifyFeedValidation(
  validator: EnhancedFeedValidator,
  feedUrl: string,
  expectedStatus = 200
): Promise<void> {
  const result = await validator.validateFeed(feedUrl);
  
  if (expectedStatus === 200) {
    expect(result.isValid).toBe(true);
    expect(result.feedInfo).toBeDefined();
    if (result.feedInfo) {
      expect(result.feedInfo.items).toBeGreaterThan(0);
    }
  } else {
    expect(result.isValid).toBe(false);
    expect(result.statusCode).toBe(expectedStatus);
  }
}

/**
 * Helper to setup error mock handlers
 */
export function setupErrorMocks(): void {
  server.use(
    // 404 handler
    http.get('http://not-found.example.com/feed.xml', () => {
      return new HttpResponse(null, { status: 404 });
    }),

    // Timeout handler
    http.get('http://timeout.example.com/feed.xml', () => {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'AbortError';
      throw error;
    }),

    // SSL error handler
    http.get('http://ssl-error.example.com/feed.xml', () => {
      const error = new Error('unable to verify the first certificate');
      error.name = 'TypeError';
      (error as any).code = 'CERT_HAS_EXPIRED';
      throw error;
    }),

    // DNS error handler
    http.get('http://dns-error.example.com/feed.xml', () => {
      const error = new Error('getaddrinfo ENOTFOUND dns-error.example.com');
      error.name = 'TypeError';
      (error as any).code = 'ENOTFOUND';
      throw error;
    }),

    // Empty response handler
    http.get('http://empty-response.example.com/feed.xml', () => {
      return new HttpResponse('', {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });
    }),

    // Invalid XML handler
    http.get('http://invalid-xml.example.com/feed.xml', () => {
      return new HttpResponse('Invalid XML', {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });
    }),

    // Empty feed handler
    http.get('http://empty-feed.example.com/feed.xml', () => {
      return new HttpResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
            <link>http://example.com</link>
            <description>Empty feed description</description>
          </channel>
        </rss>`,
        {
          status: 200,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    })
  );
}

/**
 * Helper to clean up test data for a specific user
 */
export async function cleanupUserData(pool: Pool, userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete in correct order to handle foreign key constraints
    await client.query('DELETE FROM sync_history WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM item_states WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM login_history WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    
    // Delete feed configs and related data
    const feedConfigs = await client.query('SELECT id FROM feed_configs WHERE user_id = $1', [userId]);
    for (const { id } of feedConfigs.rows) {
      await client.query('DELETE FROM processed_items WHERE feed_item_id IN (SELECT id FROM feed_items WHERE feed_config_id = $1)', [id]);
      await client.query('DELETE FROM feed_items WHERE feed_config_id = $1', [id]);
      await client.query('DELETE FROM feed_health WHERE feed_config_id = $1', [id]);
    }
    await client.query('DELETE FROM feed_configs WHERE user_id = $1', [userId]);
    
    // Finally delete the user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} 