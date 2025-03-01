declare module 'feedparser' {
  import { Transform } from 'stream';

  interface FeedMeta {
    title: string;
    description: string;
    link: string;
    xmlUrl?: string;
    date?: Date;
    pubDate?: Date;
    author?: string;
    language?: string;
    image?: {
      url: string;
      title?: string;
    };
    favicon?: string;
    copyright?: string;
    generator?: string;
    categories?: string[];
  }

  interface FeedItem {
    title: string;
    description?: string;
    summary?: string;
    link?: string;
    origlink?: string;
    permalink?: string;
    date?: Date;
    pubDate?: Date;
    author?: string;
    guid?: string;
    comments?: string;
    image?: {
      url: string;
      title?: string;
    };
    categories?: string[];
    source?: {
      url: string;
      title: string;
    };
    enclosures?: Array<{
      url: string;
      type?: string;
      length?: number;
    }>;
    meta?: FeedMeta;
  }

  interface FeedParserOptions {
    normalize?: boolean;
    addmeta?: boolean;
    feedurl?: string;
    resume_saxerror?: boolean;
    maxRedirects?: number;
  }

  class FeedParser extends Transform {
    constructor(options?: FeedParserOptions);
    
    meta: FeedMeta;
    
    read(): FeedItem | null;
    
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'meta', listener: (meta: FeedMeta) => void): this;
    on(event: 'readable', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
  }

  export = FeedParser;
} 