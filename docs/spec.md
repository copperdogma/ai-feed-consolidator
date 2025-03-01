# AI Feed Consolidator Application

20250119: Created with Claude 3.5 Sonnet
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to clarify personal-use scope and deployment strategy

## Core Purpose
Create a personal platform for managing and consuming content from various services by integrating with their native flagging systems (bookmarks, watch later, etc.), providing intelligent summaries, and maintaining a unified interface for content review and prioritization. This is primarily designed for personal use, with potential extension to immediate family members.

## Scope Clarification
- Single user focus (personal use)
- Docker-based deployment (local or fly.io)
- Web-first interface for multi-device access
- Streamlined authentication (personal API keys)
- Direct database access (no multi-user concerns)
- Flexible implementation (can be tailored to personal preferences)
- Family sharing as potential future enhancement

## Deployment Strategy
- Docker containerization for consistent environment
- Two deployment options:
  1. Local: Docker on Mac Mini home server
  2. Cloud: fly.io using existing account
- Web interface accessible from any device
- Environment variables for configuration
- Volume mounts for persistent storage
- Regular backups to secure location

## Technical Architecture

### Database Configuration
- PostgreSQL 16 for data storage
- Custom port configuration (5433) to avoid conflicts with other PostgreSQL instances
- Separate databases for development and testing:
  - Development: `ai-feed-dev` on port 5433
  - Testing: `ai-feed-test` on port 5433
- Connection strings managed via environment variables:
  - `DATABASE_URL` for development
  - `TEST_DATABASE_URL` for testing
- See `docs/database-design.md` for detailed schema information
- See `docs/commands-reference.md` for database setup instructions

### Technology Stack

## Outstanding Questions
### High Priority
- How should we integrate with third-party flagging systems?
  - Context: Need to determine technical approach for personal accounts
  - Related sections: Content Integration
  - Questions:
    - Can we hook into YouTube "Watch Later" API using personal API key?
    - What are the API limitations for personal X account?
  - Status: Needs research

- What should be the format for email-based prioritization?
  - Context: Personal email workflow integration
  - Related sections: Content Integration
  - Questions:
    - What email subject prefix works best for your workflow?
    - How to handle personal email filters/rules?
  - Status: Needs discussion

- How should we handle OpenAI API integration?
  - Context: Using personal OpenAI account
  - Related sections: Intelligent Summaries
  - Questions:
    - Which model best balances cost vs quality for personal use?
    - What's a reasonable monthly API budget?
  - Implementation:
    - Primary: Use GPT-4 for summary generation
    - Fallback: GPT-3.5-turbo for less complex tasks
    - Cache summaries to minimize API costs
  - Status: Partially resolved, needs implementation details

- How should we handle content persistence?
  - Context: Docker volume storage
  - Related sections: Historical Feed
  - Questions:
    - Backup strategy for Docker volumes?
    - Cache storage location?
  - Implementation:
    - Database: PostgreSQL (fly.io native support)
    - Local development: Docker PostgreSQL container
    - Production: fly.io PostgreSQL instance
    - Regular backups via fly.io tooling
  - Status: Partially resolved, needs backup strategy details

- What web framework should we use?
  - Context: Need a responsive web UI for all devices
  - Related sections: User Interface
  - Questions:
    - Progressive Web App features?
  - Implementation:
    - Framework: React with TypeScript
    - UI Library: Material-UI (MUI) for responsive components
    - State Management: React Query for API data
    - Build Tool: Vite for fast development
    - Mobile: Responsive design with MUI
  - Status: Resolved, ready for implementation

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
  - Direct RSS/Atom feeds (primary)
  - YouTube (Watch Later, Playlists)
  - X/Twitter (Bookmarks)
  - Email (Priority Flagging)
  - Slack (Saved Items, Important Messages)
- Maintain local state:
  - Track read/unread status
  - Save items for later
  - Handle offline scenarios
- Email integration:
  - Priority prefix in subject ("**: ")
  - URL extraction
  - Metadata parsing
- Handle authentication securely
  - Store feed credentials safely
  - Manage API keys for services
  - Encrypt sensitive data

### 2. Content Organization
#### Timeline Management
- Track content acquisition timestamp
- Maintain platform original timestamp
- Track last accessed/viewed date
- Enable chronological and priority-based sorting

#### Summary Generation
- Intelligent Content Summarization:
  - Capture essential understanding in 1-3 sentences
  - Each summary must be self-contained and actionable
  - Include critical context or caveats that change meaning
  - Prioritize facts, findings, and conclusions over background
  - For news/announcements: What changed and why it matters
  - For technical content: Key capabilities and limitations
  - For analysis pieces: Main arguments and supporting evidence
  - Recognize when content is too dense for brief summary
- Direct ChatGPT integration:
  - One-click deep analysis option
  - Custom prompt for thorough examination
  - User-guided exploration
- Time-to-consume estimates:
  - Reading time for articles
  - Video/audio duration
  - Complexity level indication

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
3. Summary generation achieves:
   - 90% of readers can decide whether to read full content
   - 80% of readers can accurately explain main points to others
   - 70% of readers need no additional context for basic understanding
   - System recognizes and flags content too complex for brief summary

## Development Priorities

### MVP Phase
1. Core platform integration:
   - YouTube Watch Later
   - X Bookmarks
   - Direct RSS feeds
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
