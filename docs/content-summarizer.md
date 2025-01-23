# Content Summarization System

20240422: Created by Cam Marsollier with Claude 3.5 Sonnet
20240422: Updated by Cam Marsollier with Claude 3.5 Sonnet to add Answer-Forward Testing
20240422: Updated by Cam Marsollier with Claude 3.5 Sonnet to remove key points in favor of comprehensive summaries

## Overview
The content summarization system provides concise, informative summaries in 1-3 sentences, focusing on what's new and important while answering natural follow-up questions. For deeper analysis, it's complemented by [gptAnalyze](gpt-analyze.md).

## Implementation

### OpenAI Service
```typescript
async extractCorePoints(content: string): Promise<SummaryResponse> {
  const completion = await this.client.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',  // Updated to JSON-capable model
    response_format: { type: "json_object" },  // Enforce JSON output
    messages: [
      {
        role: 'system',
        content: `You are a precise content analyzer that creates concise summaries.

TASK:
Create a 1-3 sentence summary (max 50 words) that captures the essential value of the content by answering the key questions for its type.

REQUIREMENTS:
1. Identify content type first
2. Focus only on what's new/different/important
3. Include only essential context
4. Ensure summary answers obvious follow-up questions
5. Be extremely concise

CONTENT TYPE GUIDELINES:
Technical:
- What new approach/technology?
- How does it improve on existing solutions?
- What background knowledge needed?

News:
- What exactly changed/happened?
- Who is affected and how?
- When does it take effect?

Analysis:
- What main argument/conclusion?
- Based on what evidence?
- Key assumptions?

Tutorial:
- What will you learn?
- Prerequisites needed?
- Practical applications?

Entertainment:
- Format and style (no spoilers)
- Genre/category
- Time investment

OUTPUT FORMAT:
Return valid JSON matching this exact schema:
{
  "summary": string,        // 1-3 sentences, max 50 words, must answer key questions for content type
  "content_type": string,   // One of: "technical", "news", "analysis", "tutorial", "entertainment"
  "time_sensitive": boolean,
  "requires_background": string[],  // Required knowledge areas, empty array if none
  "consumption_time": {
    "minutes": number,      // Time to read/watch/listen (no comprehension time)
    "type": string         // "read" | "watch" | "listen" | "mixed"
  }
}

EXAMPLE OUTPUT:
{
  "summary": "EU mandates 1-hour content moderation response time on social platforms, with 6% revenue fines for non-compliance. Affects all EU operations from June 2024. Requires immediate compliance strategy for affected platforms.",
  "content_type": "news",
  "time_sensitive": true,
  "requires_background": ["content moderation", "EU tech regulation"],
  "consumption_time": {
    "minutes": 3,          // ~600 words at average reading speed
    "type": "read"
  }
}`
      },
      {
        role: 'user',
        content: content,
      }
    ],
    temperature: 0.1,  // Reduced for more consistent output
    max_tokens: 400,
    presence_penalty: 0,  // Removed to avoid format deviation
    frequency_penalty: 0  // Removed to avoid format deviation
  });
  
  return completion.choices[0].message.content as SummaryResponse;
}

interface SummaryResponse {
  summary: string;
  content_type: 'technical' | 'news' | 'analysis' | 'tutorial' | 'entertainment';
  time_sensitive: boolean;
  requires_background: string[];
  consumption_time: {
    minutes: number;
    type: 'read' | 'watch' | 'listen' | 'mixed';
  };
}
```

### Design Principles
Based on our [Content Value Principles](content-value.md), the system prioritizes:
1. Purpose & Nature
   - Identify content type and format
   - Note time sensitivity
   - Flag if part of larger narrative
2. Novelty & Change
   - What's new or different
   - Why it matters now
3. Critical Context
   - Required background
   - Essential dependencies

### Answer-Forward Testing
Each summary is validated by:
1. Identifying natural questions from the summary
2. Including concise answers where possible
3. Verifying no critical information is omitted

See [content-value.md](content-value.md) for standard questions by content type.

### Key Features
- 1-3 sentence comprehensive summary
- JSON structure for parsing
- Content type detection
- Time sensitivity flag
- Background requirements list
- Answer-Forward validation

## Technical Details

### Processing Pipeline
1. Content extraction and cleaning
2. Type detection and preprocessing
3. Summary generation via OpenAI
4. Answer-Forward validation
5. JSON response formatting
6. Caching for efficiency

### Optimization
- Low temperature (0.3) for consistency
- Token limits for conciseness
- Structured JSON output
- Caching to minimize API costs
- Error handling for edge cases

### Content Type Handling

### Articles/Blog Posts
- Focus on main arguments and conclusions
- Include critical evidence/data
- Note novel findings/implications

### News
- Emphasize what changed
- Include critical context
- Note time sensitivity and impact

### Technical Content
- Focus on capabilities/limitations
- Note improvements/differences
- Specify prerequisites

### Entertainment
- Minimal spoilers
- Focus on format/style
- Note genre/category and time investment

### Duration Preprocessing
```typescript
interface ContentMetadata {
  wordCount?: number;
  duration?: {
    seconds: number;
    source: 'youtube' | 'podcast' | 'video' | 'calculated';
  };
  type: 'article' | 'video' | 'audio' | 'mixed';
}

function calculateConsumptionTime(metadata: ContentMetadata): { minutes: number; type: string } {
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
      // For mixed content, we need both
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

// Test cases
describe('Content Duration Calculation', () => {
  test('Article reading time', () => {
    const article: ContentMetadata = {
      type: 'article',
      wordCount: 1250 // 5 minute read at 250 wpm
    };
    expect(calculateConsumptionTime(article)).toEqual({
      minutes: 5,
      type: 'read'
    });
  });

  test('Video duration', () => {
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

  test('Mixed content', () => {
    const mixed: ContentMetadata = {
      type: 'mixed',
      wordCount: 500,
      duration: {
        seconds: 180, // 3 minute video
        source: 'video'
      }
    };
    expect(calculateConsumptionTime(mixed)).toEqual({
      minutes: 5, // 2 minutes reading + 3 minutes video
      type: 'mixed'
    });
  });

  test('Invalid content', () => {
    const invalid: ContentMetadata = {
      type: 'article'
      // Missing wordCount
    };
    expect(() => calculateConsumptionTime(invalid)).toThrow('Word count required');
  });
});
```

### Platform-Specific Extractors
```typescript
interface YouTubeMetadata {
  duration: string; // ISO 8601 duration
  // other YouTube specific fields
}

interface ArticleMetadata {
  content: string;
  // other article specific fields
}

class DurationExtractor {
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
    // PT1H2M10S -> 3730 seconds
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) throw new Error('Invalid duration format');
    
    const [_, hours, minutes, seconds] = matches;
    return (parseInt(hours || '0') * 3600) +
           (parseInt(minutes || '0') * 60) +
           parseInt(seconds || '0');
  }

  private static countWords(content: string): number {
    return content.trim().split(/\s+/).length;
  }
}

// Test cases
describe('Duration Extractor', () => {
  test('YouTube duration parsing', () => {
    const youtube: YouTubeMetadata = {
      duration: 'PT1H2M10S'
    };
    expect(DurationExtractor.fromYouTube(youtube)).toEqual({
      type: 'video',
      duration: {
        seconds: 3730,
        source: 'youtube'
      }
    });
  });

  test('Article word counting', () => {
    const article: ArticleMetadata = {
      content: 'This is a test article. It has twelve words in total.'
    };
    expect(DurationExtractor.fromArticle(article)).toEqual({
      type: 'article',
      wordCount: 12
    });
  });
});

## Success Criteria
- Answers key questions about content
- Identifies content type and requirements
- Provides critical context
- Under 50 words
- JSON parseable
- Quick to consume (<10 seconds)

## Integration Points
- FeedItemCard display
- Content type routing
- Background knowledge tracking
- Deep analysis handoff

## Automated Testing & Optimization

### Answer-Forward Testing Harness
```typescript
interface TestResult {
  originalContent: string;
  summary: SummaryResponse;
  evaluation: {
    answersForwardQuestions: boolean;
    missingCriticalInfo: string[];
    superfluousInfo: string[];
    clarity: number;  // 0-1
    accuracy: number; // 0-1
    suggestions: string[];
  };
  cost: number;
  latency: number;
}

async function evaluateSummary(content: string, summary: SummaryResponse): Promise<TestResult> {
  // Use GPT-4 to evaluate GPT-3.5's summaries
  const evaluation = await this.client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are evaluating content summaries for quality and completeness.
Analyze the summary against these criteria:
1. Does it answer the natural questions it raises?
2. Is any critical information missing?
3. Is there unnecessary information?
4. Is it clear and accurate?

Format response as JSON matching the TestResult interface.`
      },
      {
        role: 'user',
        content: `Original: ${content}\nSummary: ${JSON.stringify(summary)}`,
      }
    ]
  });
  
  return {
    originalContent: content,
    summary,
    evaluation: evaluation.choices[0].message.content,
    cost: calculateCost(content, summary, evaluation),
    latency: measureLatency()
  };
}
```

### Model Performance Analysis
- Track cost/performance ratios across models
- Compare summary quality vs. cost
- Measure latency and token usage
- Monitor error rates and edge cases
- Evaluate prompt effectiveness

### Continuous Improvement Loop
1. Generate summaries with current model/prompt
2. Evaluate with more capable model
3. Aggregate feedback patterns
4. Refine prompts and parameters
5. Compare model performance
6. Update system configuration

### Performance Metrics
- Answer completeness score
- Information density
- Cost per quality summary
- Error reduction rate
- User engagement metrics

## Future Considerations
- Enhanced question generation
- Automated validation
- User feedback integration
- Summary improvement tracking
- A/B testing different formats
- Model performance benchmarking
- Automated prompt optimization
- Cost/quality tradeoff analysis
- Multi-model testing pipeline
- Performance/cost optimization framework

## Related Systems
- [gptAnalyze](gpt-analyze.md) for deep analysis
- Content processing pipeline
- Caching infrastructure
- Error handling system

## Discussion Topics
- Should we request output in json so we can get it to return summary, category, etc? The summary data is designed to be displayed by our system (unlike the gpt-analyze output which we hand off to ChatGPT to perform), so we can assume we need to parse it.