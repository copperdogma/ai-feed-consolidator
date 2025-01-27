import { readFileSync } from 'fs';
import { join } from 'path';

export function loadFeedlySampleData() {
  const fixturePath = join(__dirname, '../fixtures/feedly-sample-response.json');
  const data = readFileSync(fixturePath, 'utf-8');
  return JSON.parse(data);
} 