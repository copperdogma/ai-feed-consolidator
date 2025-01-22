# AI Feed Consolidator Todo List

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

## Current Task
Implementing content normalization for feed items

## Active Tasks

### Feedly Integration
- [x] Review Feedly API documentation
- [x] Determine required endpoints
- [x] Add dependencies
- [x] Implement saved items retrieval
- [x] Extract sample data for testing
- [x] Document API response structure
- [x] Create content normalizer
  - [x] Define common feed item interface
  - [x] Create normalizer class
  - [x] Add normalizer tests
  - [x] Handle image metadata
  - [x] Normalize engagement metrics
- [x] Add error handling and retries
  - [x] Implement retry logic with backoff
  - [x] Add token refresh mechanism
  - [x] Handle rate limits
  - [x] Add comprehensive error tests
- [ ] Add rate limiting

### Content Processing
- [x] Design content extraction rules
- [ ] Create text summarization
- [ ] Extract key points
- [ ] Handle different content types (articles, videos, etc)

### Testing
- [x] Set up test fixtures with sample data
- [x] Create mock Feedly API responses
- [x] Add integration tests for normalizer
- [x] Add unit tests for normalizer
- [x] Test error cases

## Next Steps
1. Implement OpenAI integration for key points extraction
2. Add rate limiting to prevent API abuse
3. Create text summarization pipeline

## Completed
- [x] Initial project setup
- [x] Basic Feedly API integration
- [x] Authentication flow
- [x] Sample data collection

## Future Tasks
- [ ] Add support for additional feed sources
- [ ] Implement caching
- [ ] Add metrics and monitoring
- [ ] Create admin dashboard
- [ ] Add user preferences
- [ ] Implement search functionality

## Previous Task: Level 1 Core Points Extractor (Paused)
Steps:
1. OpenAI Integration Setup
   - [x] Add OpenAI dependency
   - [x] Create OpenAI service class
   - [x] Set up API key configuration
   - [x] Add basic error handling
   - [x] Verify integration with tests

2. Core Points Extraction Design
   - [ ] Design prompt template
   - [ ] Define output format
   - [ ] Create types for extracted points
   - [ ] Design content preprocessing strategy for different platforms

3. Platform-Specific Integration
   - [ ] Implement YouTube data fetching
   - [ ] Implement X/Twitter data fetching
   - [ ] Implement RSS/Web scraping
   - [ ] Create platform-specific content normalizers

4. Implementation
   - [ ] Build extraction service
   - [ ] Add caching layer
   - [ ] Create API endpoint
   - [ ] Add basic error handling

5. Testing & Validation
   - [ ] Create real-world test samples from each platform
   - [ ] Write unit tests
   - [ ] Test with various content types
   - [ ] Measure and optimize token usage
   - [ ] Document example outputs

## High Priority (MVP Phase)

### Core Features
- Summary Generation System
  - [ ] Level 1: Core points extractor
  - [ ] Level 2: Detailed overview generator
  - [ ] Implement caching layer
  - [ ] Set up database in Docker volume

### Content Integration
- Research and evaluate auto-news project
  - [ ] Review platform integration approaches
  - [ ] Evaluate two-level insight generation system
  - [ ] Study content filtering strategies

- OpenAI Integration
  - [ ] Configure API key management
  - [ ] Create summary generation prompts
  - [ ] Build local caching system
  - [ ] Set up cost monitoring

### Platform Integration
- YouTube Integration
  - [ ] Implement transcript extraction service
  - [ ] Design LLM prompt for video summarization
  - [ ] Implement caching layer for summaries

- Additional Platforms
  - [ ] Configure X API for Bookmarks
  - [ ] Set up Feedly API for Saved Items
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

## Future Enhancements
- [ ] Improved search capabilities
- [ ] Additional content sources
- [ ] Native mobile apps
- [ ] Shared family features

## Completed Items ✅
- Infrastructure
  - [x] Create application Dockerfile
  - [x] Set up Docker Compose for local development
  - [x] Configure PostgreSQL container
  - [x] Configure environment variables (.env and .env.example)
  - [x] Set up database migration system
  - [x] Create initial authentication schema
  - [x] Set up test infrastructure with Vitest
  - [x] Configure JSDOM for frontend testing

- Authentication
  - [x] Set up Google OAuth 2.0 integration
  - [x] Configure authentication middleware
  - [x] Implement session management
  - [x] Create authentication documentation
  - [x] Implement comprehensive auth tests
  - [x] Add logout flow testing
  - [x] Add login history tracking implementation

- Research
  - [x] YouTube Integration research
  - [x] Evaluate open-source solutions
  - [x] Document findings in design.md

- Testing
  - [x] Optimize test database cleanup process
  - [x] Fix transaction lock contention in tests
  - [x] Reduce auth error test execution time
  - [x] Improve session initialization reliability
  - [x] Add retry mechanisms for flaky tests

## Bugs
- No known bugs 