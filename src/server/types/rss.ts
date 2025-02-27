export interface RSSFeedConfig {
  id: number;
  userId: number;
  feedUrl: string;
  title: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  lastFetchedAt?: Date;
  errorCount: number;
  isActive: boolean;
  fetchIntervalMinutes: number;
  createdAt: Date;
  updatedAt: Date;
} 