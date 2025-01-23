import { Router } from 'express';
import { FeedlyService } from '../services/feedly';
import { ContentProcessor } from '../services/content-processor';
import { OpenAIService } from '../services/openai';
import { FeedlyNormalizer } from '../services/normalizers/feedly';

const router = Router();
const openai = new OpenAIService();
const contentProcessor = new ContentProcessor(openai);

router.get('/items', async (req, res) => {
  try {
    const feedly = new FeedlyService();
    const feedlyItems = await feedly.getSavedItems();
    
    // Process first 5 items for demo
    const processedItems = await Promise.all(
      feedlyItems.slice(0, 5).map(async feedlyItem => {
        const item = FeedlyNormalizer.normalize(feedlyItem);
        return await contentProcessor.processFeedItem(item);
      })
    );

    res.json(processedItems);
  } catch (error) {
    console.error('Error fetching feed items:', error);
    res.status(500).json({ error: 'Failed to fetch feed items' });
  }
});

export default router; 