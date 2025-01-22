import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAIService } from '../openai';
import { loadFeedlySampleData } from './helpers/load-fixtures';
import { FeedlyEntry } from '../feedly';

describe('OpenAI Key Points Extraction Quality', () => {
  let openai: OpenAIService;
  let sampleArticles: FeedlyEntry[];

  beforeAll(async () => {
    openai = new OpenAIService();
    sampleArticles = await loadFeedlySampleData();
  });

  it('should extract key points from AI diagnosis article', async () => {
    const article = sampleArticles.find(a => 
      a.title.includes('AI to diagnose cancer')
    );
    expect(article).toBeDefined();

    const content = article!.summary?.content || '';
    const points = await openai.extractCorePoints(content);

    expect(points).toHaveLength(3);
    expect(points.every(p => p.length <= 100)).toBe(true); // Max 15 words * avg 6 chars + spaces
    expect(points.every(p => !p.startsWith('•'))).toBe(true);
    
    // Log points for manual quality review
    console.log('AI Diagnosis Article Points:');
    points.forEach(p => console.log(`- ${p}`));
  });

  it('should extract key points from chemical reactor article', async () => {
    const article = sampleArticles.find(a => 
      a.title.includes('chemical reactor')
    );
    expect(article).toBeDefined();

    const content = article!.summary?.content || '';
    const points = await openai.extractCorePoints(content);

    expect(points).toHaveLength(3);
    expect(points.every(p => p.length <= 100)).toBe(true);
    expect(points.every(p => !p.startsWith('•'))).toBe(true);

    // Log points for manual quality review
    console.log('\nChemical Reactor Article Points:');
    points.forEach(p => console.log(`- ${p}`));
  });

  it('should extract key points from Tesla article', async () => {
    const article = sampleArticles.find(a => 
      a.title.includes('Tesla Model Y')
    );
    expect(article).toBeDefined();

    const content = article!.summary?.content || '';
    const points = await openai.extractCorePoints(content);

    expect(points).toHaveLength(3);
    expect(points.every(p => p.length <= 100)).toBe(true);
    expect(points.every(p => !p.startsWith('•'))).toBe(true);

    // Log points for manual quality review
    console.log('\nTesla Article Points:');
    points.forEach(p => console.log(`- ${p}`));
  });

  it('should handle articles with minimal content', async () => {
    const shortContent = 'The new feature allows users to quickly process documents. It saves time and improves accuracy.';
    const points = await openai.extractCorePoints(shortContent);

    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(points.every(p => p.length <= 100)).toBe(true);
    
    // Log points for manual quality review
    console.log('\nShort Content Points:');
    points.forEach(p => console.log(`- ${p}`));
  });
}); 