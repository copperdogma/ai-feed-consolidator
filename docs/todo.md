# AI Feed Consolidator Todo List

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

## Current Task
Optimizing performance and user experience

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
- [x] Add rate limiting

### Content Processing
- [x] Design content extraction rules
- [x] Extract key points
- [x] Create text summarization
- [x] Handle different content types (articles, videos, etc)

### OpenAI Integration
- [x] Configure API key management
- [x] Create key points extraction prompts
- [x] Create summary generation prompts
- [x] Build local caching system
- [x] Set up cost monitoring

### Testing
- [x] Set up test fixtures with sample data
- [x] Create mock Feedly API responses
- [x] Add integration tests for normalizer
- [x] Add unit tests for normalizer
- [x] Test error cases
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
1. Implement UI enhancements for better user experience
2. Add performance optimizations for content processing
3. Improve testing infrastructure for better reliability

## Completed
- [x] Initial project setup
- [x] Basic Feedly API integration
- [x] Authentication flow
- [x] Sample data collection
- [x] Create media type icon with integrated consumption time
- [x] Remove redundant "Summary:" prefix
- [x] Display hero image thumbnail
- [x] Left-align content and optimize vertical height
- [x] Improve chip layout and wrapping behavior
- [x] Enhance visual hierarchy with title placement
- [x] Streamline card design with subtle separators
- [x] Optimize mobile responsiveness

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
  - [x] Implement rate limiter with comprehensive tests
  - [x] Add Feedly service error handling and retry tests
  - [x] Fix authentication component tests
  - [x] Add proper timer handling in async tests

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