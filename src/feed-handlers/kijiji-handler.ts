import { HttpClient } from '../utils/http-client';
import { XmlValidator } from '../utils/xml-validator';
import { FeedContentValidator } from '../utils/feed-content-validator';
import { ValidationResult } from '../types/feed-types';

export class KijijiHandler {
  private feedValidator: FeedContentValidator;

  constructor() {
    const httpClient = new HttpClient({
      defaultUserAgent: 'AI Feed Consolidator',
      fallbackUserAgent: 'Mozilla/5.0',
      timeout: 30000
    });

    const xmlValidator = new XmlValidator();

    this.feedValidator = new FeedContentValidator({
      httpClient,
      xmlValidator
    });
  }

  async validateFeed(url: string): Promise<ValidationResult> {
    return this.feedValidator.validateFeed(url);
  }
} 