import { FeedInfo, FeedItem } from '../types/feed-types';
import { Parser } from 'xml2js';

export async function parseFeedXml(xmlContent: string): Promise<FeedInfo> {
  const parser = new Parser({
    explicitArray: false,
    trim: true,
  });

  try {
    const result = await parser.parseStringPromise(xmlContent);

    // Handle RSS 2.0
    if (result.rss?.channel) {
      const channel = result.rss.channel;
      return {
        title: channel.title,
        description: channel.description,
        url: channel.link,
        language: channel.language,
        copyright: channel.copyright,
        pubDate: channel.pubDate,
        lastBuildDate: channel.lastBuildDate,
        items: parseRssItems(channel.item),
      };
    }

    // Handle Atom
    if (result.feed) {
      const feed = result.feed;
      return {
        title: feed.title,
        description: feed.subtitle || feed.title,
        url: getAtomLink(feed.link),
        language: feed.language,
        pubDate: feed.updated,
        items: parseAtomItems(feed.entry),
      };
    }

    throw new Error('Unsupported feed format');
  } catch (error: any) {
    throw new Error(`Failed to parse XML: ${error.message}`);
  }
}

function parseRssItems(items: any | any[]): FeedItem[] {
  if (!items) return [];
  
  // Convert to array if single item
  const itemsArray = Array.isArray(items) ? items : [items];

  return itemsArray.map(item => ({
    title: item.title,
    description: item.description,
    url: item.link,
    guid: item.guid?._?.toString() || item.guid?.toString() || item.link,
    pubDate: item.pubDate,
    author: item.author || item['dc:creator'],
    categories: Array.isArray(item.category) ? item.category : item.category ? [item.category] : [],
    enclosure: item.enclosure ? {
      url: item.enclosure.$.url,
      type: item.enclosure.$.type,
      length: parseInt(item.enclosure.$.length, 10) || undefined,
    } : undefined,
  }));
}

function parseAtomItems(entries: any | any[]): FeedItem[] {
  if (!entries) return [];
  
  // Convert to array if single entry
  const entriesArray = Array.isArray(entries) ? entries : [entries];

  return entriesArray.map(entry => ({
    title: entry.title,
    description: entry.content || entry.summary,
    url: getAtomLink(entry.link),
    guid: entry.id,
    pubDate: entry.updated || entry.published,
    author: entry.author?.name,
    categories: entry.category ? 
      (Array.isArray(entry.category) ? 
        entry.category.map((cat: any) => cat.$.term || cat) : 
        [entry.category.$.term || entry.category]
      ) : [],
  }));
}

function getAtomLink(link: any | any[]): string | undefined {
  if (!link) return undefined;
  
  if (Array.isArray(link)) {
    // Try to find the 'alternate' link first
    const alternate = link.find(l => l.$.rel === 'alternate' || !l.$.rel);
    return alternate?.$.href || link[0]?.$.href;
  }
  
  return link.$.href;
} 