# AI Feed Consolidator Todo List

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

NOTE: when a task and all sub-tasks are 100% complete, delete them from this file.

## Vertical Slice Features
Core features needed to validate the primary use case:

### Feed Management
- [ ] Implement direct RSS feed management
  - [ ] Create feed configuration UI
  - [ ] Add feed validation
  - [ ] Implement feed health checks
  - [ ] Add feed metadata storage
  - [ ] Create feed polling system
  - [ ] Implement content deduplication
  - [ ] Add HTML content extraction
  - [ ] Handle media detection
  - [ ] Future: Add OPML import support

### Priority Management
- [ ] Implement priority feed view
  - [ ] Create unified view combining unread and saved items
  - [ ] Add sorting by date and priority
  - [ ] Implement priority indicators
  - [ ] Add quick actions for priority management
  - [ ] Create priority-based filters

### Content Actions
- [ ] Add core content actions
  - [ ] Implement "Mark as Read" functionality
  - [ ] Add "Save for Later" capability
  - [ ] Store read/saved states locally
  - [ ] Add proper loading states for actions
  - [ ] Handle offline state gracefully
  - [ ] Add success/error notifications

### UI Enhancements
- [ ] Optimize feed view for content management
  - [ ] Add feed configuration panel
  - [ ] Implement feed health indicators
  - [ ] Add quick action buttons
  - [ ] Add proper loading states
  - [ ] Improve error handling feedback
  - [ ] Add offline support indicators

### Database Support
- [ ] Implement feed persistence
  - [ ] Create feeds table
  - [ ] Create feed_items table
  - [ ] Create processed_items table
  - [ ] Create item_states table
  - [ ] Add indexes for common queries
  - [ ] Implement cleanup job
  - [ ] Add proper transaction support
  - [ ] Implement robust database cleanup
  - [ ] Add login history tracking

- [ ] Add caching layer
  - [ ] Cache feed responses
  - [ ] Cache processed summaries
  - [ ] Track item status locally
  - [ ] Implement feed polling

## Current Task
- Fix Feed Display Issues
  - [x] Fix data flow and state management
    - [x] Implement proper transformFeedItem function
    - [x] Remove duplicate state management
      - [x] Refactor FeedManagement.tsx to use React Query mutations
      - [x] Remove manual optimistic updates in handleToggleActive
      - [x] Migrate FeedItemCard.tsx to use React Query for saved state
      - [x] Implement proper error handling in mutations
      - [x] Add retry logic for failed mutations
      - [x] Remove local state duplicates for server-state (isSaved/isActive)
    - [x] Add proper React Query configuration
  - [x] Verify API integration
    - [x] Verify /api/feed/items endpoint implementation
    - [x] Ensure consistent feed item transformation
    - [x] Add proper error handling and retries
  - [x] Refactor UI components
    - [x] Create dedicated FeedDisplay component
    - [x] Move source mapping to data transformation layer
    - [x] Improve loading and error states
  - [x] Enhance error handling
    - [x] Add error tracking and monitoring
    - [x] Implement proper retry logic
    - [x] Add user-friendly error messages

## Active Tasks

### Feed Management
- [x] Design feed configuration schema
- [x] Create feed_configs table
- [x] Implement feed validation
- [x] Add feed health checks
- [x] Create feed polling system
- [x] Add OPML import support
- [ ] Implement content deduplication
- [ ] Add HTML content extraction
- [ ] Handle media detection

### Content Processing
- [x] Design content extraction rules
- [x] Extract key points
- [x] Create text summarization
- [x] Handle different content types (articles, videos, etc)

### Testing
- [x] Set up test fixtures with sample RSS feeds
- [x] Add integration tests for RSS service
- [x] Add unit tests for feed polling
- [x] Test error cases
- [x] Fix auth history test failures
- [x] Initialize LoginHistoryService in test setup
- [ ] Improve OpenAI quality tests to handle stochastic responses
  - [ ] Run each test multiple times (e.g. 20x) to ensure statistical accuracy
  - [ ] Consider acceptable ranges/categories for responses rather than exact matches
  - [ ] Track success rates and only fail if error rate exceeds threshold
  - [ ] Consider moving to a separate test suite that runs less frequently

### UI Enhancements
- [ ] Add sorting options (by date, reading time, source)
- [ ] Implement infinite scroll
- [ ] Add loading indicators for feed items
- [ ] Add visual cues for time-sensitive content
- [ ] Add search functionality
- [ ] Implement dark mode support

### Performance Optimization
- [ ] Process more than 5 items at a time
- [ ] Add caching for processed items
- [ ] Implement background processing for new items

## Next Steps
1. Create UI for feed management
2. Add OPML import support
3. Implement content deduplication
4. Add HTML content extraction
5. Handle media detection


## Future Tasks
- [ ] Add support for additional feed sources
- [ ] Implement caching
- [ ] Add metrics and monitoring
- [ ] Create admin dashboard
- [ ] Add user preferences
- [ ] Implement search functionality

## Previous Task: Level 1 Core Points Extractor (Completed)
Steps:
1. OpenAI Integration Setup
   - [x] Add OpenAI dependency
   - [x] Create OpenAI service class
   - [x] Set up API key configuration
   - [x] Add basic error handling
   - [x] Verify integration with tests

2. Core Points Extraction Design
   - [x] Design prompt template
   - [x] Define output format
   - [x] Create types for extracted points
   - [x] Design content preprocessing strategy for different platforms

3. Platform-Specific Integration
   - [ ] Implement YouTube data fetching
   - [ ] Implement X/Twitter data fetching
   - [ ] Implement RSS/Web scraping
   - [ ] Create platform-specific content normalizers

4. Implementation
   - [x] Build extraction service
   - [x] Add caching layer
   - [x] Create API endpoint
   - [x] Add basic error handling

5. Testing & Validation
   - [x] Create real-world test samples from each platform
   - [x] Write unit tests
   - [x] Test with various content types
   - [x] Measure and optimize token usage
   - [x] Document example outputs

## High Priority (MVP Phase)

### Core Features
- Summary Generation System
  - [x] Initial summary generator
  - [ ] Enhance summary generation with Answer-Forward Testing
  - [x] Implement caching layer
  - [ ] Set up database in Docker volume

### Content Integration
- Research and evaluate auto-news project
  - [ ] Review platform integration approaches
  - [ ] Evaluate two-level insight generation system
  - [ ] Study content filtering strategies

- OpenAI Integration
  - [x] Configure API key management
  - [x] Create key points extraction prompts
  - [ ] Create summary generation prompts
  - [x] Build local caching system
  - [x] Set up cost monitoring

### Platform Integration
- YouTube Integration
  - [ ] Implement transcript extraction service
  - [ ] Design LLM prompt for video summarization
  - [ ] Implement caching layer for summaries

- Additional Platforms
  - [ ] Configure X API for Bookmarks
  - [ ] Set up RSS feed management and sync
  - [ ] Design email integration
  - [ ] Set up URL extraction

### Testing & Quality Assurance
- Frontend Testing
  - [ ] Add tests for error boundaries
  - [ ] Implement integration tests for main flows

- Backend Testing
  - [ ] Add database integration tests
  - [ ] Implement API endpoint tests

### Infrastructure
- Development Environment
  - [ ] Configure React Query:
    - [ ] Set up QueryClient and Provider
    - [ ] Configure default options (caching, retries)
    - [ ] Migrate existing data fetching to React Query hooks

- Deployment
  - [ ] Configure fly.io deployment
  - [ ] Set up PostgreSQL instance

## Medium Priority
- [ ] Design and implement personal sync system
- [ ] Add offline support
- [ ] Implement basic search
- Enhanced Security Features
  - [x] Add proper session management
  - [x] Implement user authentication
  - [x] Add login history tracking
  - [ ] Implement CSRF protection
  - [ ] Add rate limiting for auth endpoints
  - [ ] Configure production cookie settings
  - [ ] Remove hardcoded test credentials
  - [ ] Use environment variables consistently

## Low Priority
- [ ] Family account support
- [ ] Enhanced topic management
- [ ] Progressive Web App features
- [ ] Export functionality
- Production Deployment Setup
  - [ ] Configure HTTPS endpoints
  - [ ] Set up production environment variables
  - [ ] Configure secure session management
  - [ ] Implement proper error handling

## Future Enhancements
- [ ] Improved search capabilities
- [ ] Additional content sources
- [ ] Native mobile apps
- [ ] Shared family features

## Bugs
- No known bugs 

### Content Value Documentation
- [ ] Split first principles in content-value.md into two sections:
  - Quick summary principles (for key points extraction)
  - Deep analysis principles (for ChatGPT prompt)

### General Tasks
- [ ] Research ChatGPT web search capabilities via querystring
  - Investigate if we can enable web search mode
  - Evaluate impact on context-gathering
  - Test fact-checking capabilities
  - Document findings and implementation approach 

## Current Focus
- Implement Answer-Forward Testing Framework
  - Build evaluation harness using GPT-4 for summary quality assessment
  - Create cost/performance tracking system
  - Set up automated testing pipeline
  - Implement prompt refinement feedback loop
  - Add metrics collection and analysis

## Testing & Optimization
- Set up model comparison framework
  - Compare GPT-3.5 vs GPT-4 vs Claude for summary generation
  - Track cost/performance ratios
  - Measure latency and token usage
  - Monitor error rates
  - Evaluate prompt effectiveness across models

- Implement continuous improvement system
  - Build feedback aggregation system
  - Create prompt refinement pipeline
  - Set up A/B testing framework
  - Add performance metrics dashboard
  - Implement cost optimization tracking 

## Paused Tasks
- Testing save/unsave functionality
  - Endpoint is responding with 404
  - Need to verify after database implementation
  - Check local state synchronization

# Upcoming Tasks

## High Priority
- Migrate from raw SQL migrations to Sequelize migrations
  - Convert existing SQL migrations in `/migrations` to Sequelize migrations
  - Update documentation to reflect Sequelize-only migration process
  - Test migration process on fresh database to ensure all schema changes are captured
  - Remove SQL migration system once migration is complete

## Medium Priority
- [ ] Design and implement personal sync system
- [ ] Add offline support
- [ ] Implement basic search
- Enhanced Security Features
  - [ ] Implement CSRF protection
  - [ ] Add rate limiting for auth endpoints
  - [ ] Set up audit logging
  - [ ] Configure production cookie settings
  - [ ] Remove hardcoded test credentials and use environment variables consistently

## Low Priority
- [ ] Family account support
- [ ] Enhanced topic management
- [ ] Progressive Web App features
- [ ] Export functionality
- Production Deployment Setup
  - [ ] Configure HTTPS endpoints
  - [ ] Set up production environment variables
  - [ ] Configure secure session management
  - [ ] Implement proper error handling