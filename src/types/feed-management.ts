export interface Feed {
  id: number;
  feedUrl: string;
  title?: string;
  description?: string;
  siteUrl?: string;
  iconUrl?: string;
  lastFetchedAt?: string;
  errorCount: number;
  isActive: boolean;
  fetchIntervalMinutes: number;
  updateFrequency: string;
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
} 