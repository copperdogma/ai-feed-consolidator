# Content Manager Application

20250119: Created with Claude 3.5 Sonnet

## Core Purpose
Create a centralized platform for managing and consuming content from various services by integrating with their native flagging systems (bookmarks, watch later, etc.), providing intelligent summaries, and maintaining a unified interface for content review and prioritization.

## Outstanding Questions
### High Priority
- How should we integrate with third-party flagging systems?
  - Context: Need to determine technical approach for each platform
  - Related sections: Content Integration
  - Questions:
    - Can we hook into YouTube "Watch Later" API?
    - What are the API limitations for X bookmarks?
    - How to handle Feedly saved items?
  - Status: Needs research

- What should be the format for email-based prioritization?
  - Context: Users need a reliable way to flag content via email
  - Related sections: Content Integration
  - Questions:
    - What email subject prefix indicates priority?
    - Should there be multiple priority levels?
    - How to handle malformed subjects?
  - Status: Needs discussion

### Medium Priority
- How should historical content be organized?
  - Context: Need to balance accessibility with performance
  - Related sections: Historical Feed
  - Status: Needs discussion

- What metadata should we store per content item?
  - Context: Affects search and filtering capabilities
  - Status: Needs specification

## Fundamental Principles
1. **Platform Integration First**
   - Leverage existing platform flags (bookmarks, watch later, saves)
   - Maintain sync with platform status
   - Respect platform limitations and API constraints
   - Enable flagging during normal platform use when possible

2. **Efficient Consumption**
   - Clear, structured summaries
   - Time-to-consume estimates
   - Quick priority management
   - Topic-based organization
   - Easy access to original content

3. **Complete History**
   - Preserve all content and summaries
   - Maintain reading/viewing status
   - Track priority changes
   - Enable efficient historical search

4. **User Agency**
   - Control over prioritization
   - Freedom to use original platforms
   - Choice in consumption method
   - Flexible organization options

## Core Requirements

### 1. Content Integration
- Connect to multiple content sources:
  - YouTube (Watch Later, Playlists)
  - X/Twitter (Bookmarks)
  - Feedly (Saved Items)
  - Email (Priority Flagging)
  - Slack (Saved Items, Important Messages)
- Maintain platform sync:
  - Update status when consumed
  - Reflect priority changes
  - Handle offline scenarios
- Email integration:
  - Priority prefix in subject ("**: ")
  - URL extraction
  - Metadata parsing
- Handle authentication securely

### 2. Content Organization
#### Timeline Management
- Track content acquisition timestamp
- Maintain platform original timestamp
- Track last accessed/viewed date
- Enable chronological and priority-based sorting

#### Summary Generation
- Two-level summary system:
  - Level 1: Core points/direct answers
    - Answer headline questions (Betteridge's Law)
    - Extract key findings
    - List main conclusions
  - Level 2: Detailed overview
    - Supporting points
    - Context and caveats
    - Key quotes or timestamps
- Time-to-consume estimates:
  - Reading time for articles
  - Video/audio duration
  - Complexity indicators

#### Topic Organization
- Automatic topic detection
- Topic-based grouping
- Cross-platform topic alignment
- Default collapsed topic view:
  - Topic name
  - Content count by type
  - Priority distribution
  - Latest additions
- Expanded topic view:
  - Priority-sorted content
  - Summary preview
  - Platform indicators
  - Consumption estimates

### 3. User Interface
#### Content Views
- Primary views:
  - All Content (chronological)
  - High Priority
  - By Topic
  - By Platform
- Content cards showing:
  - Title
  - Source platform
  - Time to consume
  - Summary preview
  - Priority status
  - Topic tags
- Quick actions:
  - Toggle priority
  - Mark consumed
  - Open original
  - Expand summary

#### Topic Management
- Automatic categorization
- Manual topic adjustment
- Topic merging/splitting
- Priority inheritance options

### 4. Historical Feed
- Infinite scroll interface
- Performance optimization
- Advanced search/filter
- Export capabilities
- Activity tracking:
  - Consumption patterns
  - Priority changes
  - Topic evolution

### 5. Learning System
- Track user behavior:
  - Content consumption
  - Priority patterns
  - Topic interests
  - Platform preferences
- Improve:
  - Topic detection
  - Summary relevance
  - Priority suggestions
  - Content organization

## Success Criteria
1. Platform flag sync completed in <30 seconds
2. Summary generation takes <5 seconds
3. Users spend <30 seconds reviewing summaries
4. Two-level summaries capture >90% of key information
5. System maintains responsiveness with 10,000+ items
6. Historical content accessible within 2 clicks
7. Priority management takes <2 clicks
8. Original content accessible within 1 click

## Development Priorities

### MVP Phase
1. Core platform integration:
   - YouTube Watch Later
   - X Bookmarks
   - Feedly Saved
2. Basic email integration
3. Two-level summary generation
4. Simple priority management
5. Basic topic organization
6. Essential historical feed

### Future Phases
1. Advanced topic refinement
2. Enhanced learning system
3. Slack integration
4. Additional platforms
5. Advanced search/filter
6. Export capabilities
7. Mobile interface

Would you like me to expand on any of these sections or discuss specific requirements in more detail?
