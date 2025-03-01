import express from 'express';
import { FeedItemService } from '../services/feed-item';
import { logger } from '../logger';
import { requireAuth } from '../auth';
import { getServiceContainer } from '../services/service-container';

const router = express.Router();

// Get saved feed items
router.get('/', requireAuth, async (req, res) => {
  const userId = Number(req.user?.id);
  if (!userId || isNaN(userId)) {
    logger.warn({ userId: req.user?.id }, 'Get feed items attempted without valid user ID');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const feedItemService = getServiceContainer().getService<FeedItemService>('feedItemService');
    const items = await feedItemService.getSavedItems(userId);
    res.json(items);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, userId }, 'Failed to fetch feed items');
    res.status(500).json({ error: 'Failed to fetch feed items' });
  }
});

// Toggle saved status
router.post('/:id/toggle-saved', requireAuth, async (req, res, next) => {
  const userId = Number(req.user?.id);
  if (!userId || isNaN(userId)) {
    logger.warn({ userId: req.user?.id }, 'Toggle saved attempted without valid user ID');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.params;
  const { saved } = req.body;

  if (typeof saved !== 'boolean') {
    logger.warn({ saved }, 'Invalid saved parameter');
    res.status(400).json({ error: 'Invalid saved parameter' });
    return;
  }

  logger.info({ id, saved, userId }, 'Toggle saved request');

  try {
    const feedItemService = getServiceContainer().getService<FeedItemService>('feedItemService');
    await feedItemService.updateItemState(userId, id, { isSaved: saved });
    logger.info({ id, saved, userId }, 'Successfully toggled saved state');
    res.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg, id, saved, userId }, 'Failed to toggle saved state');
    res.status(500).json({ error: 'Failed to toggle saved state' });
  }
});

export default router; 