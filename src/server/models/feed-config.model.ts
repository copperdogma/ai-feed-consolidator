export interface FeedConfig {
  id: number;
  user_id: number;
  feed_url: string;
  feed_type: string;
  title: string;
  description: string;
  site_url: string;
  icon_url: string;
  is_active: boolean;
  fetch_interval_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface FeedHealth {
  feed_config_id: number;
  last_check_at: Date;
  last_error_at: Date | null;
  last_error_category: string | null;
  last_error_detail: string | null;
  consecutive_failures: number;
  is_permanently_invalid: boolean;
  requires_special_handling: boolean;
  special_handler_type: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FeedUpdateResult {
  status: string;
  itemCount?: number;
  error?: string;
  feedHealth?: FeedHealth;
} 