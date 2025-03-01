# gptAnalyze Feature Documentation

20240422: Created by Cam Marsollier with Claude 3.5 Sonnet

## Overview
gptAnalyze is the system's deep analysis feature that opens content in ChatGPT with a specialized prompt for thorough examination. This complements our quick key points extraction by providing users with on-demand detailed analysis.

## Implementation

### Core Function
```typescript
const gptAnalyze = (item: FeedItem) => {
  const prompt = `Analyze ${item.url}

Please search the web and provide:
1. Main arguments and key findings
2. Supporting evidence and data
3. Context and implications
4. Notable quotes or statements
5. Technical details or methodologies
6. Critical evaluation`;

  const encodedPrompt = encodeURIComponent(prompt);
  const chatGPTUrl = `https://chat.openai.com/?q=${encodedPrompt}`;
  window.open(chatGPTUrl, '_blank');
};
```

### Current Prompt Design
The prompt is designed to:
- Request web searching for additional context
- Structure the analysis systematically
- Cover both factual content and critical evaluation
- Enable thorough understanding of the content

## Design Philosophy
gptAnalyze serves as the "deep dive" complement to our quick key points extraction. While the key points extractor provides immediate value assessment, gptAnalyze enables users to:
- Get comprehensive analysis when needed
- Access additional context through web search
- Understand complex implications
- Evaluate credibility and evidence

See [Content Value Principles](content-value.md) for the foundational thinking that informs this feature's design.

## Technical Notes
- Uses ChatGPT's URL parameters for prompt injection
- Opens in new tab to maintain current context
- Relies on ChatGPT's web search capabilities
- No direct API integration required

## Future Considerations
- Monitor ChatGPT's URL parameter stability
- Evaluate prompt effectiveness across content types
- Consider content-type specific prompt variations
- Track usage patterns to optimize prompt

## Related Components
- FeedItemCard: Hosts the gptAnalyze button
- Key Points Extractor: Complementary quick summary feature
- Content Processing Pipeline: Provides input content

## Usage Guidelines
1. Use for content requiring deeper understanding
2. Particularly valuable for:
   - Complex technical content
   - Nuanced arguments
   - Content requiring additional context
   - Topics needing fact-checking

## Success Metrics
- User engagement with the feature
- Complementary usage with key points
- User satisfaction with analysis depth
- Time saved in content evaluation 