import { XMLParser } from 'fast-xml-parser';
import { HttpClient, HttpResponse } from '../../../utils/http-client';
import { ValidationResult, ErrorCategory, FeedInfo } from '../../../types/feed-health';
import { FeedItem } from '../../../types/feed';

export class KijijiHandler {
  private parser: XMLParser;
  private httpClient: HttpClient;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    this.httpClient = new HttpClient(
      'AI Feed Consolidator/1.0',
      'Mozilla/5.0',
      30000
    );
  }

  async validateFeed(feedUrl: string): Promise<ValidationResult> {
    try {
      const response = await this.httpClient.get(feedUrl);
      const content = await response.text();
      
      if (!response.ok) {
        return {
          url: feedUrl,
          isValid: false,
          errorCategory: 'HTTP_STATUS' as ErrorCategory,
          errorDetail: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          requiresSpecialHandling: true,
          specialHandlerType: 'KIJIJI'
        };
      }

      // Parse XML from response content
      const xmlDoc = this.parser.parse(content);
      
      // Validate RSS structure
      if (!xmlDoc.rss?.channel) {
        return {
          url: feedUrl,
          isValid: false,
          errorCategory: 'PARSE_ERROR' as ErrorCategory,
          errorDetail: 'Invalid RSS feed structure',
          requiresSpecialHandling: true,
          specialHandlerType: 'KIJIJI'
        };
      }

      const channel = xmlDoc.rss.channel;
      
      // Validate required channel elements
      if (!channel.title || !channel.description || !channel.link) {
        return {
          url: feedUrl,
          isValid: false,
          errorCategory: 'PARSE_ERROR' as ErrorCategory,
          errorDetail: 'Missing required RSS channel elements',
          requiresSpecialHandling: true,
          specialHandlerType: 'KIJIJI'
        };
      }

      // Success case
      return {
        url: feedUrl,
        isValid: true,
        feedInfo: {
          title: channel.title,
          description: channel.description,
          link: channel.link
        },
        requiresSpecialHandling: true,
        specialHandlerType: 'KIJIJI'
      };
    } catch (error: any) {
      return {
        url: feedUrl,
        isValid: false,
        errorCategory: 'NETWORK_ERROR' as ErrorCategory,
        errorDetail: error.message,
        requiresSpecialHandling: true,
        specialHandlerType: 'KIJIJI'
      };
    }
  }

  async fetchFeed(feedUrl: string): Promise<FeedItem[]> {
    const response = await this.httpClient.get(feedUrl);
    const content = await response.text();
    
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: HTTP ${response.status}`);
    }

    const xmlDoc = this.parser.parse(content);
    
    if (!xmlDoc.rss?.channel?.item) {
      return [];
    }

    const items = Array.isArray(xmlDoc.rss.channel.item) 
      ? xmlDoc.rss.channel.item 
      : [xmlDoc.rss.channel.item];

    return items.map((item: any) => {
      const id = item.guid || item.link || '';
      return {
        id,
        title: item.title || '',
        content: item.description || '',
        summary: item.description ? item.description.substring(0, 200) : '',
        url: item.link || '',
        sourceId: feedUrl,
        externalId: id,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: {
          id: 'kijiji',
          name: 'Kijiji',
          platform: 'rss',
          url: feedUrl
        },
        media: [],
        topics: item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : []
      };
    });
  }
} 