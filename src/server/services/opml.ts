import { Pool } from 'pg';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { RSSService } from './rss/rss-service';
import { logger } from '../logger';
import { IServiceContainer } from './service-container.interface';

const parseXML = promisify(parseString);

export interface ImportResult {
  added: number;
  failed: number;
  errors: Array<{
    url: string;
    error: string;
  }>;
}

interface OPMLOutline {
  $: {
    text: string;
    title?: string;
    xmlUrl?: string;
    htmlUrl?: string;
    type?: string;
  };
  outline?: OPMLOutline[];
}

interface OPMLBody {
  outline: OPMLOutline[];
}

interface OPMLRoot {
  opml: {
    $: { version: string };
    head: Array<{ title: string[] }>;
    body: [OPMLBody];
  };
}

export class OPMLService {
  private readonly rssService: RSSService;
  private readonly pool: Pool;
  private static instance: OPMLService | null = null;

  constructor(private serviceContainer: IServiceContainer) {
    if (!serviceContainer) {
      throw new Error('ServiceContainer must be provided');
    }
    logger.info('Initializing OPMLService');
    this.pool = serviceContainer.getPool();
    this.rssService = serviceContainer.getService<RSSService>('rssService');
  }

  /**
   * Import feeds from OPML content
   */
  async importOPML(userId: number, opmlContent: string): Promise<ImportResult> {
    const result: ImportResult = {
      added: 0,
      failed: 0,
      errors: []
    };

    try {
      let opml: any;
      try {
        opml = await parseXML(opmlContent);
      } catch (error) {
        logger.error({ error }, 'Failed to parse OPML file');
        throw new Error('Invalid OPML file format');
      }

      if (!this.isValidOPMLRoot(opml)) {
        throw new Error('Invalid OPML file format');
      }

      const feeds = this.extractFeeds(opml);

      for (const feed of feeds) {
        try {
          await this.rssService.addFeed(userId, feed.xmlUrl);
          result.added++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            url: feed.xmlUrl,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid OPML file format') {
        throw error;
      }
      logger.error({ error }, 'Failed to process OPML file');
      throw new Error('Invalid OPML file format');
    }
  }

  /**
   * Type guard for OPML root object
   */
  private isValidOPMLRoot(obj: any): obj is OPMLRoot {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.opml &&
      Array.isArray(obj.opml.body) &&
      obj.opml.body.length > 0 &&
      obj.opml.body[0].outline
    );
  }

  /**
   * Extract feed URLs from OPML structure
   */
  private extractFeeds(opml: OPMLRoot): Array<{ xmlUrl: string }> {
    const feeds: Array<{ xmlUrl: string }> = [];
    const outlines = opml.opml.body[0].outline;

    const processOutline = (outline: OPMLOutline) => {
      if (outline.$ && outline.$.type === 'rss' && outline.$.xmlUrl) {
        feeds.push({ xmlUrl: outline.$.xmlUrl });
      }
      if (outline.outline) {
        outline.outline.forEach(processOutline);
      }
    };

    outlines.forEach(processOutline);
    return feeds;
  }
} 