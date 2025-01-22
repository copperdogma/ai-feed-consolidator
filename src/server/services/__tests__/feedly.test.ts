import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedlyService, FeedlyError } from '../feedly';
import fs from 'fs/promises';
import path from 'path';
import { loadFeedlySampleData } from './helpers/load-fixtures';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: (error: any) => error?.isAxiosError === true,
  },
}));

describe('FeedlyService', () => {
  let feedlyService: FeedlyService;

  beforeEach(() => {
    feedlyService = new FeedlyService();
    vi.clearAllMocks();
  });

  describe('getSavedItems', () => {
    it('should retrieve saved items and save sample data', async () => {
      // Mock successful response
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { items: [{ id: '1', title: 'Test' }] }
      });

      const items = await feedlyService.getSavedItems(5);
      
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(1);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('title');
    });

    it('should retry on temporary failures', async () => {
      // Mock a temporary failure followed by success
      vi.mocked(axios.get)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 500 }
        })
        .mockResolvedValueOnce({ data: { items: [{ id: '1', title: 'Test' }] } });

      const items = await feedlyService.getSavedItems();
      
      expect(items).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should refresh token on 401 and retry', async () => {
      // Mock 401 followed by success after token refresh
      vi.mocked(axios.get)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 401 }
        })
        .mockResolvedValueOnce({ data: { items: [{ id: '1', title: 'Test' }] } });

      vi.mocked(axios.post).mockResolvedValueOnce({ 
        data: { access_token: 'new_token' } 
      });

      const items = await feedlyService.getSavedItems();
      
      expect(items).toHaveLength(1);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent failures', async () => {
      // Mock a 400 Bad Request
      vi.mocked(axios.get).mockRejectedValue({
        isAxiosError: true,
        response: { 
          status: 400,
          data: { errorMessage: 'Invalid request' }
        }
      });

      await expect(feedlyService.getSavedItems())
        .rejects
        .toThrow('API request failed: Invalid request');

      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should respect rate limits', async () => {
      // Mock a 429 Too Many Requests
      vi.mocked(axios.get)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 429 }
        })
        .mockResolvedValueOnce({ data: { items: [{ id: '1', title: 'Test' }] } });

      const items = await feedlyService.getSavedItems();
      
      expect(items).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Sample Data Analysis', () => {
    it('should load and validate sample data structure', async () => {
      const sampleItems = await loadFeedlySampleData();
      
      expect(Array.isArray(sampleItems)).toBe(true);
      expect(sampleItems.length).toBeGreaterThan(0);

      const firstItem = sampleItems[0];
      expect(firstItem).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        published: expect.any(Number),
      });

      // Verify content fields
      if (firstItem.content) {
        expect(firstItem.content.content).toBeDefined();
        expect(typeof firstItem.content.content).toBe('string');
      }
      if (firstItem.summary) {
        expect(firstItem.summary.content).toBeDefined();
        expect(typeof firstItem.summary.content).toBe('string');
      }

      // Verify metadata
      if (firstItem.keywords) {
        expect(Array.isArray(firstItem.keywords)).toBe(true);
      }
      if (firstItem.engagement) {
        expect(typeof firstItem.engagement).toBe('number');
      }
    });
  });
}); 