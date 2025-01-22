import fs from 'fs/promises';
import path from 'path';
import { FeedlyEntry } from '../../feedly';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * Load sample Feedly entries from the fixture data
 * @returns Array of FeedlyEntry objects
 */
export async function loadFeedlySampleData(): Promise<FeedlyEntry[]> {
  const filePath = path.join(FIXTURES_DIR, 'feedly-sample-response.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(fileContent) as FeedlyEntry[];
} 