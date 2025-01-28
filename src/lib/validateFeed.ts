import { z } from 'zod';

const FeedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  origin: z.object({
    streamId: z.string(),
    title: z.string(),
    htmlUrl: z.string().optional()
  }),
  consumption_time: z.object({
    minutes: z.number(),
    type: z.enum(['read', 'watch', 'listen'])
  }),
  content_type: z.enum(['technical', 'news', 'analysis', 'tutorial', 'entertainment'])
});

export const validateFeedResponse = (data: unknown) => 
  z.array(FeedItemSchema).safeParse(data); 