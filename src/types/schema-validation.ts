import { z } from 'zod';

// Base schemas for common fields
const timestampFields = {
  created_at: z.date(),
  updated_at: z.date()
};

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string().nullable(),
  google_id: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  ...timestampFields
});

// Feed config schema
export const feedConfigSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  feed_url: z.string().url(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  site_url: z.string().url().nullable(),
  icon_url: z.string().url().nullable(),
  last_fetched_at: z.date().nullable(),
  error_count: z.number(),
  error_category: z.string().nullable(),
  is_active: z.boolean(),
  fetch_interval_minutes: z.number(),
  ...timestampFields
});

// Feed item schema
export const feedItemSchema = z.object({
  id: z.number(),
  feed_config_id: z.number(),
  guid: z.string(),
  title: z.string(),
  url: z.string().url(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  author: z.string().nullable(),
  categories: z.array(z.string()).nullable(),
  published_at: z.date(),
  ...timestampFields
});

// Feed health schema
export const feedHealthSchema = z.object({
  id: z.number(),
  feed_config_id: z.number(),
  last_check_at: z.date().nullable(),
  consecutive_failures: z.number(),
  last_error_category: z.string().nullable(),
  last_error_detail: z.string().nullable(),
  is_permanently_invalid: z.boolean(),
  requires_special_handling: z.boolean(),
  special_handler_type: z.string().nullable(),
  ...timestampFields
});

// Item state schema
export const itemStateSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  feed_item_id: z.number(),
  is_read: z.boolean(),
  is_saved: z.boolean(),
  ...timestampFields
});

// Processed item schema
export const processedItemSchema = z.object({
  id: z.number(),
  feed_item_id: z.number(),
  processed_summary: z.string(),
  content_type: z.string(),
  time_sensitive: z.boolean(),
  required_background: z.array(z.string()),
  consumption_time_minutes: z.number().nullable(),
  consumption_type: z.string().nullable(),
  processed_at: z.date(),
  version: z.number(),
  ...timestampFields
});

// Export types inferred from schemas
export type User = z.infer<typeof userSchema>;
export type FeedConfig = z.infer<typeof feedConfigSchema>;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type FeedHealth = z.infer<typeof feedHealthSchema>;
export type ItemState = z.infer<typeof itemStateSchema>;
export type ProcessedItem = z.infer<typeof processedItemSchema>; 