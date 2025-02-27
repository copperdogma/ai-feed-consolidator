export interface RSSFeedConfig {
  id: number;
  user_id: number;
  feed_url: string;
  feed_type: string;
  title: string;
  description?: string;
  site_url?: string;
  icon_url?: string;
  last_fetched_at?: Date;
  error_count: number;
  error_category?: string;
  last_error?: string;
  is_active: boolean;
  fetch_interval_minutes: number;
  created_at: Date;
  updated_at: Date;
} 