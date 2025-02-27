export interface LocalFeedItem {
  id?: number;
  feed_config_id: number;
  guid: string;
  title: string;
  url: string;
  description: string | null;
  content: string | null;
  author: string | null;
  categories: string[] | null;
  published_at: Date;
  created_at?: Date;
  updated_at?: Date;
} 