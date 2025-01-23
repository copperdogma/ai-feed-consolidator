/*
// Tests temporarily disabled - see todo.md for planned improvements
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService } from '../openai';
import fs from 'fs';
import path from 'path';

describe('OpenAI Quality Tests', () => {
  let openaiService: OpenAIService;
  let aiDiagnosisArticle: string;
  let chemicalReactorArticle: string;
  let teslaArticle: string;

  beforeEach(() => {
    openaiService = new OpenAIService();
    
    // Load test fixtures
    const fixturesPath = path.join(__dirname, 'fixtures');
    aiDiagnosisArticle = fs.readFileSync(path.join(fixturesPath, 'ai-diagnosis-article.txt'), 'utf-8');
    chemicalReactorArticle = fs.readFileSync(path.join(fixturesPath, 'chemical-reactor-article.txt'), 'utf-8');
    teslaArticle = fs.readFileSync(path.join(fixturesPath, 'tesla.txt'), 'utf-8');
  });

  it('should handle AI diagnosis article appropriately', async () => {
    const result = await openaiService.createSummary(aiDiagnosisArticle);
    
    expect(result.content_type).toBe('technical');
    expect(result.time_sensitive).toBe(false);
    expect(result.requires_background).toContain('machine learning');
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle chemical reactor article appropriately', async () => {
    const result = await openaiService.createSummary(chemicalReactorArticle);
    
    expect(result.content_type).toBe('technical');
    expect(result.time_sensitive).toBe(false);
    expect(result.requires_background).toContain('chemical engineering');
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle Tesla article appropriately', async () => {
    const result = await openaiService.createSummary(teslaArticle);
    
    expect(result.content_type).toBe('news');
    expect(result.time_sensitive).toBe(true);
    expect(result.requires_background).toContain('electric vehicles');
    expect(result.summary.split('.').length).toBeLessThanOrEqual(3);
  });

  it('should handle articles with minimal content', async () => {
    const result = await openaiService.createSummary('Brief update on weather: Sunny today.');
    
    expect(result.content_type).toBe('news');
    expect(result.time_sensitive).toBe(true);
    expect(result.requires_background).toHaveLength(0);
    expect(result.consumption_time.minutes).toBeLessThanOrEqual(1);
  });
});
*/ 