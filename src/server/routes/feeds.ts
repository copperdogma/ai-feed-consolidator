import { Router } from 'express';
import { RSSService, RSSError } from '../services/rss';
import { pool } from '../services/db';
import { logger } from '../logger';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { FeedItemService } from '../services/feed-item';

const router = Router();
const rssService = new RSSService(pool);
const feedItemService = new FeedItemService(pool);

// Validation schemas
const addFeedSchema = z.object({
  feedUrl: z.string().url()
});

const updateFeedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  fetchIntervalMinutes: z.number().min(5).max(1440).optional() // 5 min to 24 hours
});

/**
 * Get all feeds for the current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id as "userId", feed_url as "feedUrl", title,
              description, site_url as "siteUrl", icon_url as "iconUrl",
              last_fetched_at as "lastFetchedAt", error_count as "errorCount",
              is_active as "isActive", fetch_interval_minutes as "fetchIntervalMinutes",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM feed_configs 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    if (error instanceof RSSError) {
      logger.error({ error: error.message }, 'RSS error getting user feeds');
      res.status(500).json({ error: error.message });
      return;
    }
    logger.error({ error }, 'Unexpected error getting user feeds');
    res.status(500).json({ error: 'Failed to get feeds' });
  }
});

/**
 * Add a new feed
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { feedUrl } = addFeedSchema.parse(req.body);
    const feed = await rssService.addFeed(req.user!.id, feedUrl);
    res.status(201).json(feed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    if (error instanceof RSSError) {
      logger.error({ error: error.message }, 'RSS error adding feed');
      res.status(500).json({ error: error.message });
      return;
    }
    logger.error({ error }, 'Unexpected error adding feed');
    res.status(500).json({ error: 'Failed to add feed' });
  }
});

/**
 * Update a feed
 */
router.patch('/:feedId', requireAuth, async (req, res) => {
  try {
    const feedId = parseInt(req.params.feedId);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    const updates = updateFeedSchema.parse(req.body);
    logger.info({ 
      userId: req.user!.id, 
      feedId, 
      updates 
    }, 'Updating feed');

    const feed = await rssService.updateFeed(req.user!.id, feedId, updates);
    
    logger.info({ 
      userId: req.user!.id, 
      feedId, 
      updatedFeed: feed 
    }, 'Feed updated successfully');
    
    res.json(feed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    if (error instanceof RSSError) {
      logger.error({ error: error.message }, 'RSS error updating feed');
      res.status(500).json({ error: error.message });
      return;
    }
    logger.error({ error }, 'Unexpected error updating feed');
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

/**
 * Delete a feed
 */
router.delete('/:feedId', requireAuth, async (req, res) => {
  try {
    const feedId = parseInt(req.params.feedId);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    await rssService.deleteFeed(req.user!.id, feedId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof RSSError) {
      logger.error({ error: error.message }, 'RSS error deleting feed');
      res.status(500).json({ error: error.message });
      return;
    }
    logger.error({ error }, 'Unexpected error deleting feed');
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

/**
 * Get feed items
 */
router.get('/:feedId/items', requireAuth, async (req, res) => {
  try {
    const feedId = parseInt(req.params.feedId);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    // First verify the user owns this feed
    const feed = await rssService.getFeed(req.user!.id, feedId);
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    const items = await feedItemService.getFeedItems(feedId);
    res.json(items);
  } catch (error) {
    logger.error({ error }, 'Error getting feed items');
    res.status(500).json({ error: 'Failed to get feed items' });
  }
});

/**
 * Manually refresh a feed
 */
router.post('/:feedId/refresh', requireAuth, async (req, res) => {
  try {
    const feedId = parseInt(req.params.feedId);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    logger.info({ userId: req.user!.id, feedId }, 'Starting feed refresh');

    // First verify the user owns this feed
    const feed = await rssService.getFeed(req.user!.id, feedId);
    if (!feed) {
      logger.warn({ userId: req.user!.id, feedId }, 'Feed not found during refresh');
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Reset error count and force refresh
    await pool.query(
      `UPDATE feed_configs 
       SET error_count = 0, 
           last_fetched_at = NULL
       WHERE id = $1`,
      [feedId]
    );

    logger.info({ userId: req.user!.id, feedId, feedUrl: feed.feedUrl }, 'Polling feed');

    // Force an immediate refresh
    await rssService.pollFeed(feed);

    // Get the updated feed state
    const updatedFeed = await rssService.getFeed(req.user!.id, feedId);
    
    logger.info({ 
      userId: req.user!.id, 
      feedId,
      feedUrl: feed.feedUrl,
      updatedFeed 
    }, 'Feed refreshed successfully');
    
    res.json(updatedFeed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error({ 
      error: errorMessage,
      stack: errorStack,
      userId: req.user!.id, 
      feedId: req.params.feedId 
    }, 'Error refreshing feed');
    
    res.status(500).json({ 
      error: 'Failed to refresh feed',
      details: errorMessage
    });
  }
});

/**
 * Get all feed items for the current user
 */
router.get('/items', requireAuth, async (req, res) => {
  try {
    // Get all active feeds for the user
    const feeds = await rssService.getUserFeeds(req.user!.id);
    const activeFeeds = feeds.filter(feed => feed.isActive);

    // Get items from all active feeds
    const allItems = await Promise.all(
      activeFeeds.map(feed => feedItemService.getFeedItems(feed.id))
    );

    // Flatten and sort by published date
    const items = allItems
      .flat()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    res.json(items);
  } catch (error) {
    logger.error({ error }, 'Error getting all feed items');
    res.status(500).json({ error: 'Failed to get feed items' });
  }
});

export default router; 