import { describe, expect, test } from 'vitest';
import { DurationExtractor, ContentMetadata, calculateConsumptionTime } from '../duration-extractor';

describe('Duration Extractor', () => {
  describe('YouTube Duration Parsing', () => {
    test('parses hours, minutes, seconds', () => {
      const youtube = { duration: 'PT1H2M10S' };
      expect(DurationExtractor.fromYouTube(youtube)).toEqual({
        type: 'video',
        duration: {
          seconds: 3730,
          source: 'youtube'
        }
      });
    });

    test('parses minutes and seconds only', () => {
      const youtube = { duration: 'PT5M30S' };
      expect(DurationExtractor.fromYouTube(youtube)).toEqual({
        type: 'video',
        duration: {
          seconds: 330,
          source: 'youtube'
        }
      });
    });

    test('parses seconds only', () => {
      const youtube = { duration: 'PT45S' };
      expect(DurationExtractor.fromYouTube(youtube)).toEqual({
        type: 'video',
        duration: {
          seconds: 45,
          source: 'youtube'
        }
      });
    });

    test('handles invalid format', () => {
      const youtube = { duration: 'invalid' };
      expect(() => DurationExtractor.fromYouTube(youtube)).toThrow('Invalid duration format');
    });
  });

  describe('Article Word Counting', () => {
    test('counts simple words', () => {
      const article = { content: 'This is a test article.' };
      expect(DurationExtractor.fromArticle(article)).toEqual({
        type: 'article',
        wordCount: 5
      });
    });

    test('handles multiple spaces', () => {
      const article = { content: 'This   has   extra   spaces' };
      expect(DurationExtractor.fromArticle(article)).toEqual({
        type: 'article',
        wordCount: 4
      });
    });

    test('handles newlines and tabs', () => {
      const article = { content: 'This has\nnewlines\tand\ttabs' };
      expect(DurationExtractor.fromArticle(article)).toEqual({
        type: 'article',
        wordCount: 5
      });
    });

    test('handles empty content', () => {
      const article = { content: '' };
      expect(DurationExtractor.fromArticle(article)).toEqual({
        type: 'article',
        wordCount: 0
      });
    });
  });
});

describe('Consumption Time Calculation', () => {
  test('calculates article reading time', () => {
    const article: ContentMetadata = {
      type: 'article',
      wordCount: 1250 // 5 minute read at 250 wpm
    };
    expect(calculateConsumptionTime(article)).toEqual({
      minutes: 5,
      type: 'read'
    });
  });

  test('calculates video duration', () => {
    const video: ContentMetadata = {
      type: 'video',
      duration: {
        seconds: 384, // 6:24 video
        source: 'youtube'
      }
    };
    expect(calculateConsumptionTime(video)).toEqual({
      minutes: 7,
      type: 'watch'
    });
  });

  test('calculates mixed content duration', () => {
    const mixed: ContentMetadata = {
      type: 'mixed',
      wordCount: 500,
      duration: {
        seconds: 180,
        source: 'video'
      }
    };
    expect(calculateConsumptionTime(mixed)).toEqual({
      minutes: 5, // 2 minutes reading + 3 minutes video
      type: 'mixed'
    });
  });

  test('handles missing word count', () => {
    const invalid: ContentMetadata = {
      type: 'article'
    };
    expect(() => calculateConsumptionTime(invalid)).toThrow('Word count required');
  });

  test('handles missing duration', () => {
    const invalid: ContentMetadata = {
      type: 'video'
    };
    expect(() => calculateConsumptionTime(invalid)).toThrow('Duration required');
  });

  test('handles missing mixed content data', () => {
    const invalid: ContentMetadata = {
      type: 'mixed',
      wordCount: 500 // missing duration
    };
    expect(() => calculateConsumptionTime(invalid)).toThrow('Both word count and duration required');
  });
}); 