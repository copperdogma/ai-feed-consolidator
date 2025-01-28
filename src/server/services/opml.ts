import { Pool } from 'pg';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { RSSService } from './rss';
import { logger } from '../logger';

const parseXML = promisify(parseString);

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

  constructor(private readonly pool: Pool, rssService?: RSSService) {
    this.rssService = rssService || new RSSService(pool);
  }

  /**
   * Import feeds from an OPML file
   */
  async importOPML(userId: number, opmlContent: string): Promise<{ 
    added: number;
    failed: number;
    errors: Array<{ url: string; error: string }>;
  }> {
    try {
      const result = await parseXML(opmlContent);
      const outlines = this.extractOutlines(result);
      
      const stats = {
        added: 0,
        failed: 0,
        errors: [] as Array<{ url: string; error: string }>
      };

      for (const outline of outlines) {
        if (outline.xmlUrl) {
          try {
            await this.rssService.addFeed(userId, outline.xmlUrl);
            stats.added++;
            logger.info({
              userId,
              feedUrl: outline.xmlUrl,
              feedTitle: outline.title || outline.text
            }, 'Successfully imported feed from OPML');
          } catch (error) {
            stats.failed++;
            stats.errors.push({
              url: outline.xmlUrl,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error({
              error,
              userId,
              feedUrl: outline.xmlUrl,
              feedTitle: outline.title || outline.text
            }, 'Failed to import feed from OPML');
          }
        }
      }

      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to parse OPML file');
      throw new Error('Invalid OPML file format');
    }
  }

  /**
   * Recursively extract feed outlines from OPML structure
   */
  private extractOutlines(opml: OPMLRoot): Array<{
    text: string;
    title?: string;
    xmlUrl?: string;
    htmlUrl?: string;
    type?: string;
  }> {
    const outlines: ReturnType<OPMLService['extractOutlines']> = [];
    
    const processOutline = (outline: OPMLOutline) => {
      // Add this outline if it has an XML URL (represents a feed)
      if (outline.$?.xmlUrl) {
        outlines.push({
          text: outline.$.text,
          title: outline.$.title,
          xmlUrl: outline.$.xmlUrl,
          htmlUrl: outline.$.htmlUrl,
          type: outline.$.type
        });
      }
      
      // Recursively process any child outlines
      if (outline.outline) {
        outline.outline.forEach(processOutline);
      }
    };

    // Process all root outlines
    opml.opml.body[0].outline.forEach(processOutline);
    
    return outlines;
  }
} 