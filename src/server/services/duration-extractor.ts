export interface ContentMetadata {
  wordCount?: number;
  duration?: {
    seconds: number;
    source: 'youtube' | 'podcast' | 'video' | 'calculated';
  };
  type: 'article' | 'video' | 'audio' | 'mixed';
}

export interface YouTubeMetadata {
  duration: string; // ISO 8601 duration
}

export interface ArticleMetadata {
  content: string;
}

export class DurationExtractor {
  static fromYouTube(metadata: YouTubeMetadata): ContentMetadata {
    return {
      type: 'video',
      duration: {
        seconds: this.parseISO8601Duration(metadata.duration),
        source: 'youtube'
      }
    };
  }

  static fromArticle(metadata: ArticleMetadata): ContentMetadata {
    return {
      type: 'article',
      wordCount: this.countWords(metadata.content)
    };
  }

  private static parseISO8601Duration(duration: string): number {
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) throw new Error('Invalid duration format');
    
    const [_, hours, minutes, seconds] = matches;
    return (parseInt(hours || '0') * 3600) +
           (parseInt(minutes || '0') * 60) +
           parseInt(seconds || '0');
  }

  private static countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

export function calculateConsumptionTime(metadata: ContentMetadata): { minutes: number; type: string } {
  const WORDS_PER_MINUTE = 250; // Average reading speed

  switch (metadata.type) {
    case 'article':
      if (!metadata.wordCount) {
        throw new Error('Word count required for articles');
      }
      return {
        minutes: Math.ceil(metadata.wordCount / WORDS_PER_MINUTE),
        type: 'read'
      };

    case 'video':
    case 'audio':
      if (!metadata.duration) {
        throw new Error('Duration required for video/audio');
      }
      return {
        minutes: Math.ceil(metadata.duration.seconds / 60),
        type: metadata.type === 'video' ? 'watch' : 'listen'
      };

    case 'mixed':
      if (!metadata.wordCount || !metadata.duration) {
        throw new Error('Both word count and duration required for mixed content');
      }
      return {
        minutes: Math.ceil((metadata.wordCount / WORDS_PER_MINUTE) + (metadata.duration.seconds / 60)),
        type: 'mixed'
      };

    default:
      throw new Error(`Unknown content type: ${metadata.type}`);
  }
} 