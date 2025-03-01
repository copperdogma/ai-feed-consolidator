import { Router, Request, Response } from 'express';
import { RSSService } from '../services/rss/rss-service';
import { getServiceContainer } from '../services/service-container';
import { logger } from '../logger';
import { requireAuth } from '../auth';
import { z } from 'zod';
import { FeedItemService } from '../services/feed-item';
import { OPMLService } from '../services/opml';
import multer from 'multer';
import { FeedRepository } from '../services/rss/feed-repository';

const router = Router();
const container = getServiceContainer();
const rssService = container.getService<RSSService>('rssService');
const feedItemService = container.getService<FeedItemService>('feedItemService');
const opmlService = container.getService<OPMLService>('opmlService');
const feedRepository = container.getService<FeedRepository>('feedRepository');

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
    files: 1
  }
});

// Validation schemas
const addFeedSchema = z.object({
  url: z.string().url()
});

const updateFeedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  fetchIntervalMinutes: z.number().min(5).max(1440).optional() // 5 min to 24 hours
});

/**
 * Get all feeds for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const feeds = await rssService.getUserFeeds(req.user!.id);
    res.json(feeds);
  } catch (error) {
    logger.error({ error }, 'Error getting feeds');
    res.status(500).json({ error: 'Failed to get feeds' });
  }
});

/**
 * Add a new feed for the authenticated user
 */
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = addFeedSchema.parse(req.body);
    const feed = await rssService.addFeed(req.user!.id, url);
    res.status(201).json(feed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    logger.error({ error }, 'Error adding feed');
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to add feed' });
    }
  }
});

/**
 * Delete a feed
 */
router.delete('/:feedId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const feedId = parseInt(req.params.feedId);
  if (isNaN(feedId)) {
    res.status(400).json({ error: 'Invalid feed ID' });
    return;
  }

  try {
    // Check if feed exists and belongs to user
    const feed = await rssService.getFeed(req.user!.id, feedId);
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Delete feed
    await rssService.deleteFeed(req.user!.id, feedId);
    res.status(204).send();
  } catch (error) {
    logger.error({ error, feedId }, 'Error deleting feed');
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

/**
 * Get feed health information
 */
router.get('/:feedId/health', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const feedId = parseInt(req.params.feedId);
  if (isNaN(feedId)) {
    res.status(400).json({ error: 'Invalid feed ID' });
    return;
  }

  try {
    // Check if feed exists and belongs to user
    const feed = await rssService.getFeed(req.user!.id, feedId);
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Get feed health
    const health = await rssService.getFeedHealth(feedId);
    if (!health) {
      res.status(404).json({ error: 'Feed health not found' });
      return;
    }
    res.json(health);
  } catch (error) {
    logger.error({ error, feedId }, 'Error getting feed health');
    res.status(500).json({ error: 'Failed to get feed health' });
  }
});

/**
 * Update a feed
 */
router.patch('/:feedId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const feedId = parseInt(req.params.feedId);
    if (isNaN(feedId)) {
      res.status(400).json({ error: 'Invalid feed ID' });
      return;
    }

    const updates = updateFeedSchema.parse(req.body);
    logger.info({ userId: req.user!.id, feedId, updates }, 'Updating feed');

    // First verify the user owns this feed
    const feed = await rssService.getFeed(req.user!.id, feedId);
    if (!feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Update feed metadata if title or description changed
    if (updates.title !== undefined || updates.description !== undefined) {
      await feedRepository.updateFeedMetadata(feedId, {
        title: updates.title,
        description: updates.description,
        link: feed.siteUrl // Keep existing site URL
      });
    }

    // Update feed config if isActive or fetchIntervalMinutes changed
    if (updates.isActive !== undefined || updates.fetchIntervalMinutes !== undefined) {
      await feedRepository.updateFeedConfig(feedId, {
        isActive: updates.isActive,
        fetchIntervalMinutes: updates.fetchIntervalMinutes
      });
    }

    // Get updated feed
    const updatedFeed = await rssService.getFeed(req.user!.id, feedId);
    
    logger.info({ userId: req.user!.id, feedId, updatedFeed }, 'Feed updated successfully');
    res.json(updatedFeed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    logger.error({ error }, 'Error updating feed');
    res.status(500).json({ error: 'Failed to update feed' });
  }
});

/**
 * Get feed items
 */
router.get('/:feedId/items', requireAuth, async (req: Request, res: Response): Promise<void> => {
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
 * Get all feed items for the current user
 */
router.get('/items', requireAuth, async (req: Request, res: Response): Promise<void> => {
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

/**
 * Manually refresh a feed
 */
router.post('/:feedId/refresh', requireAuth, async (req: Request, res: Response): Promise<void> => {
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

    // Reset error count and force refresh by setting lastFetchedAt to null
    await feedRepository.updateFeedConfig(feedId, {
      isActive: true
    });

    // Force an immediate update by setting lastFetchedAt to null
    await feedRepository.resetLastFetchedAt(feedId);

    // Trigger the feed update
    await rssService.updateFeeds();

    // Get the updated feed state
    const updatedFeed = await rssService.getFeed(req.user!.id, feedId);
    
    logger.info({ userId: req.user!.id, feedId, updatedFeed }, 'Feed refreshed successfully');
    res.json(updatedFeed);
  } catch (error) {
    logger.error({ error, userId: req.user!.id, feedId: req.params.feedId }, 'Error refreshing feed');
    res.status(500).json({ error: 'Failed to refresh feed' });
  }
});

/**
 * Import feeds from OPML file
 */
router.post('/import', requireAuth, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const opmlContent = req.file.buffer.toString('utf-8');
    
    logger.info({ userId: req.user!.id, contentLength: opmlContent.length }, 'Starting OPML import');

    const result = await opmlService.importOPML(req.user!.id, opmlContent);
    
    logger.info({ userId: req.user!.id, ...result }, 'OPML import completed');
    res.json(result);
  } catch (error) {
    logger.error({ error, userId: req.user!.id }, 'Error importing OPML file');
    res.status(500).json({ 
      error: 'Failed to import OPML file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 