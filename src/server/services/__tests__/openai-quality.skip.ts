import { describe, it, expect } from 'vitest';
import { OpenAIService } from '../openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAIService();

describe('OpenAI Summary Quality Tests', () => {
  const aiDiagnosisArticle = readFileSync(
    join(__dirname, 'fixtures', 'ai-diagnosis-article.txt'),
    'utf-8'
  );

  const chemicalReactorArticle = readFileSync(
    join(__dirname, 'fixtures', 'chemical-reactor-article.txt'),
    'utf-8'
  );

  const teslaArticle = readFileSync(
    join(__dirname, 'fixtures', 'tesla.txt'),
    'utf-8'
  );

  it('should handle AI diagnosis article appropriately', async () => {
    const result = await openai.createSummary(aiDiagnosisArticle);
    
    expect(result.content_type).toBe('technical');
    expect(result.time_sensitive).toBe(false);
    expect(result.requires_background).toContain('machine learning');
    expect(result.consumption_time.type).toBe('read');
    expect(result.consumption_time.minutes).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle chemical reactor article appropriately', async () => {
    const result = await openai.createSummary(chemicalReactorArticle);
    
    expect(result.content_type).toBe('technical');
    expect(result.time_sensitive).toBe(false);
    expect(result.requires_background).toContain('chemical engineering');
    expect(result.consumption_time.type).toBe('read');
    expect(result.consumption_time.minutes).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle Tesla article appropriately', async () => {
    const result = await openai.createSummary(teslaArticle);
    
    expect(result.content_type).toBe('news');
    expect(result.time_sensitive).toBe(true);
    expect(result.requires_background).toContain('electric vehicles');
    expect(result.consumption_time.type).toBe('read');
    expect(result.consumption_time.minutes).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle articles with minimal content', async () => {
    const result = await openai.createSummary('Brief update on weather: Sunny today in Seattle.');
    
    expect(result.content_type).toBe('news');
    expect(result.time_sensitive).toBe(true);
    expect(result.consumption_time.minutes).toBeLessThan(2);
    expect(result.summary).toBeTruthy();
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });
}); 