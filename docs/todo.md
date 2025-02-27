# AI Feed Consolidator Todo List

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

NOTE: when a task and all sub-tasks are 100% complete, delete them from this file.

# Uncategorized New Tasks (should be added below where they most make sense, but always leave this heading in place)
- Create a new todo-completed.md file to track completed tasks as this document is getting long and unwieldy.
- When summarizing an article, use heuristics as to when to include an image (like physical product announcements)
- For summarizing Youtube videos, use the transcript to generate the summary, not the video description. This repo does it: https://github.com/kazuki-sf/YouTube_Summary_with_ChatGPT?utm_source=chatgpt.com
- Search the tests for brittle tests, like checking for an exact UI string instead of an element id/data tag. Fix that.

## Current Task
Refactor Feed Validation Error Handling

### Problem
The current error handling architecture violates Single Responsibility Principle with overlapping error handling in multiple places, making it hard to test and maintain.

### Root Causes
1. Error categories are being transformed multiple times through the stack
2. Same error types (SSL, DNS) handled in multiple places
3. Each layer trying to be too smart about error handling
4. No single source of truth for error categorization

### Steps to Resolve
1. Create New Error Handling Architecture
   - [ ] Create new ErrorMapper class as single source of truth
   - [ ] Remove error handling from HttpClient
   - [ ] Remove error handling from EnhancedFeedValidator
   - [ ] Remove error handling from FeedContentValidator
   - [ ] Update tests to use new error handling flow

2. Implement ErrorMapper
   - [ ] Define comprehensive error categories
   - [ ] Create static categorization methods
   - [ ] Add proper type definitions
   - [ ] Add detailed error messages
   - [ ] Add header parsing logic

3. Update HttpClient
   - [ ] Remove error transformation logic
   - [ ] Return raw errors with full context
   - [ ] Preserve error headers and properties
   - [ ] Update tests for raw error handling

4. Update Feed Validators
   - [ ] Remove redundant error handling
   - [ ] Use ErrorMapper for categorization
   - [ ] Update validation logic
   - [ ] Update tests for new error flow

5. Testing
   - [ ] Add ErrorMapper unit tests
   - [ ] Update HttpClient tests
   - [ ] Update validator tests
   - [ ] Add integration tests
   - [ ] Verify error categories

6. Documentation
   - [ ] Document error handling architecture
   - [ ] Update API documentation
   - [ ] Add error handling examples
   - [ ] Document testing approach

### Success Criteria
- Single source of truth for error handling
- Clear separation of responsibilities
- Simplified testing
- Consistent error categories
- Preserved error context
- Improved maintainability

## Vertical Slice Features
Core features needed to validate the primary use case:

### Feed Management
- [ ] Implement content deduplication
- [ ] Add HTML content extraction
- [ ] Handle media detection

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
- [ ] Implement cleanup job
- [ ] Add proper transaction support
- [ ] Implement robust database cleanup

- [ ] Add caching layer
  - [ ] Cache feed responses
  - [ ] Cache processed summaries
  - [ ] Track item status locally
  - [ ] Implement feed polling

## Completed Milestones
20240218: Fixed Auth Test Infrastructure
- Implemented proper timeout handling in auth tests
- Added connection pool management with proper cleanup
- Fixed cleanup deadlocks with improved isolation
- Added comprehensive test retry mechanism
- Enhanced error logging and tracking
- Improved login history tracking with user ID association
- Added proper test isolation between runs
- Implemented proper database state cleanup

20240210: Fixed PostgreSQL Test Infrastructure
- Implemented proper connection pool lifecycle management
- Added connection tracking and proper cleanup
- Enhanced test infrastructure with proper transaction isolation
- Added comprehensive logging for database operations
- Improved error handling and retry logic
- Added health checks and graceful shutdown
- Fixed database deadlocks with advisory locks
- Updated documentation with testing best practices

## Next Steps
- [ ] Migrate from node-fetch to axios
  - [ ] Research axios retry configuration
  - [ ] Plan migration strategy
  - [ ] Update feed validation tests
- [ ] Upgrade feed parsing
  - [ ] Research feedparser vs rss-parser
  - [ ] Compare features and maintenance status
  - [ ] Plan migration if needed
- [ ] Documentation
  - [ ] Document feed validation architecture
  - [ ] Create error handling guide
  - [ ] Update commands-reference.md with new test commands

## Backlog
- [ ] Add performance benchmarks for feed validation
- [ ] Implement caching for feed validation results
- [ ] Add metrics collection for validation failures
- [ ] Create dashboard for monitoring feed health

## Active Tasks

### Testing
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

## Future Tasks
- [ ] Add support for additional feed sources
- [ ] Implement caching
- [ ] Add metrics and monitoring
- [ ] Create admin dashboard
- [ ] Add user preferences
- [ ] Implement search functionality

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

- [ ] Investigate duplicate feed configuration errors in integration tests: ensure that only numeric feed_config IDs are used and that test fixtures provide unique feed URLs per user.

## Paused Tasks
- Testing save/unsave functionality
  - Endpoint is responding with 404
  - Need to verify after database implementation
  - Check local state synchronization

# Upcoming Tasks

## High Priority
- Delete "KijijiFeedIssues.md" before checking in

## Log of Completed Tasks

### 20240204: Major Refactoring Milestone
✅ Split monolithic app.ts into focused modules
  - Created separate auth module (google-strategy.ts, session.ts, middleware.ts)
  - Moved service initialization to dedicated module
  - Reorganized routes into logical groups
  - Updated imports and dependencies

✅ Implemented service container for dependency management
  - Created ServiceContainer class
  - Added service registration system
  - Updated service initialization process
  - Added type safety for service retrieval

✅ Refactored services to follow Single Responsibility Principle
  - Split RSSService into RSSFetcher, RSSParser, and FeedRepository
  - Created focused test doubles for each service
  - Updated service dependencies
  - Registered RSS services in container
  - Deleted old monolithic services

✅ Refactored FeedManagement Component
  - Created FeedList component (display only)
  - Created FeedItem component (individual feed display)
  - Created AddFeedDialog component
  - Created EditFeedDialog component
  - Created DeleteConfirmDialog component
  - Created ImportDialog component for OPML handling
  - Extracted business logic into custom hooks
  - Organized types and utilities
  - Improved component testability and maintainability

✅ Refactored UserService into Focused Services
  - Created UserService for core user operations
  - Created UserPreferencesService for preferences management
  - Created GoogleAuthService for OAuth integration
  - Created TransactionManager for database transaction handling
  - Added proper dependency injection
  - Implemented clean interfaces between services
  - Added comprehensive error handling
  - Added structured logging
  - Created focused unit tests for each service

✅ Implemented Feed Management Features
  - Designed feed configuration schema
  - Created feed_configs table
  - Implemented feed validation
  - Added feed health checks
  - Created feed polling system
  - Added OPML import support

✅ Implemented Database Support
  - Created feeds table
  - Created feed_items table
  - Created processed_items table
  - Created item_states table
  - Added indexes for common queries
  - Added login history tracking

✅ Implemented Content Processing
  - Designed content extraction rules
  - Extracted key points
  - Created text summarization
  - Handled different content types (articles, videos, etc)

✅ Enhanced Security Features
  - Added proper session management
  - Implemented user authentication
  - Added login history tracking

✅ Docker Container Setup
  - Started PostgreSQL container with proper configuration
  - Created test database
  - Ran migrations
  - Verified container stability

✅ Refactor UserService into Focused Services
  **Context:** The UserService has grown into a monolith handling too many responsibilities, making it difficult to test and maintain. This refactoring will improve code quality, testability, and maintainability.

  **Goals:**
  - ✅ Improve testability by separating concerns
  - ✅ Reduce complexity through focused services
  - ✅ Eliminate race conditions in preference handling
  - ✅ Make the codebase more maintainable
  - ✅ Improve error handling and logging

  **Tasks:**
  1. Create New Service Classes:
     - ✅ `UserService` - Core user operations only
       - ✅ findById
       - ✅ findByEmail
       - ✅ updateUser
       - ✅ deleteUser
       - ✅ validateUser
     - ✅ `UserPreferencesService` - Preferences management
       - ✅ getPreferences
       - ✅ updatePreferences
       - ✅ createDefaultPreferences
       - ✅ validatePreferences
     - ✅ `GoogleAuthService` - OAuth integration
       - ✅ findOrCreateGoogleUser
       - ✅ updateGoogleProfile
       - ✅ linkGoogleAccount
       - ✅ unlinkGoogleAccount
     - ✅ `TransactionManager` - Database transaction handling
       - ✅ withTransaction
       - ✅ withReadTransaction
       - ✅ withWriteTransaction
       - ✅ handleDeadlocks

  2. Implement Each Service:
     - ✅ Move existing code to appropriate services
     - ✅ Add proper dependency injection
     - ✅ Implement clean interfaces between services
     - ✅ Add comprehensive error handling
     - ✅ Add structured logging

  3. Update Tests:
     - ✅ Create focused unit tests for each service
     - ✅ Add integration tests for critical paths
     - ✅ Implement proper test doubles
     - ✅ Add transaction testing utilities
     - ✅ Update existing tests to use new structure

  4. Documentation:
     - [ ] Update API documentation
     - [ ] Add service interaction diagrams
     - [ ] Document error handling approach
     - [ ] Update testing guidelines

  5. Validation:
     - [ ] Verify all existing functionality works
     - [ ] Check performance implications
     - [ ] Validate error handling
     - [ ] Test concurrent operations
     - [ ] Verify logging effectiveness

  **Next Steps:**
  1. Complete documentation updates
  2. Run integration tests to verify all functionality
  3. Monitor performance and error logs in development
  4. Update API endpoints to use new services
  5. Deploy changes to staging environment

✅ Refactor FeedManagement Component
  **Context:** The FeedManagement component has grown into a monolith that handles too many responsibilities, making it difficult to test and maintain. This refactoring will improve code quality, testability, and maintainability.

  **Goals:**
  - ✅ Improve component testability
  - ✅ Reduce component complexity
  - ✅ Separate concerns
  - ✅ Improve error handling
  - ✅ Make state management more maintainable

  **Tasks:**
  1. Split into Smaller Components:
     - ✅ Create `FeedList` component (display only)
     - ✅ Create `FeedItem` component (individual feed display)
     - ✅ Create `AddFeedDialog` component
     - ✅ Create `EditFeedDialog` component
     - ✅ Create `DeleteConfirmDialog` component
     - ✅ Create `ImportDialog` component for OPML handling

  2. Extract Business Logic:
     - ✅ Create `useFeedManagement` hook for core feed operations
     - ✅ Create `useFeedMutations` hook for API calls
     - ✅ Create `useDialogState` hook for dialog management (merged into useFeedManagement)
     - ✅ Create `useImportOPML` hook for OPML handling (merged into useFeedMutations)

  3. Organize Types and Utilities:
     - ✅ Create `types/feed-management.ts` for shared types
     - ✅ Create `api/feed-management.ts` for API calls (implemented in useFeedMutations)
     - ✅ Create `utils/error-handling.ts` for centralized error handling (implemented as api-helpers.ts)
     - ✅ Create `utils/feed-validators.ts` for feed validation logic (implemented in API)

  4. Update Tests:
     - [ ] Create focused test suites for each new component
     - [ ] Add unit tests for custom hooks
     - [ ] Add integration tests for key user flows
     - [ ] Update existing tests to use new component structure

  5. Documentation:
     - [ ] Document component responsibilities
     - [ ] Add JSDoc comments for hooks and utilities
     - [ ] Update component props documentation
     - [ ] Add usage examples

  **Success Criteria:**
  - ✅ All components have clear, single responsibilities
  - [ ] Test coverage remains high with more focused tests
  - ✅ No component exceeds 200 lines of code
  - ✅ Error handling is centralized and consistent
  - ✅ State management is simplified and predictable

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

## OPML Import Error Verification (Priority: High)

### Implementation Tasks
- [ ] Create feed verification utility
  - [ ] HTTP GET with proper headers
  - [ ] SSL certificate handling
  - [ ] Feed format validation
  - [ ] Error categorization
  - [ ] Results logging

### Feed Verification Progress
Total Feeds to Check: 46

#### HTTP Status Errors (404, 403, 410)
- [ ] twitrss.me/twitter_user_to_rss/?user=Fantasticmaps (404)
- [ ] dnd.wizards.com/rss.xml (404)
- [ ] Multiple kijiji.ca feeds (403) - May need special handling
- [ ] newscientist.com/feed.ns (410)
- [ ] alistapart.com/feed/rss.xml (404)
- [ ] bizarro.com/feed/ (404)
- [ ] forums.plex.tv/categories/release-announcements/feed.rss (404)
- [ ] technologyreview.com/newsfeed/rss/trrd_newsfeed.xml (404)
- [ ] treehugger.com/atom.xml (404)

#### Certificate/SSL Issues
- [ ] calgary.kijiji.ca feeds
- [ ] erat.org/rss/redmeat.xml

#### Feed Format/Parsing Issues
- [ ] capp.ca/feed/ (Invalid character)
- [ ] fool.com/about/headlines/rss_headlines.asp (Malformed comment)
- [ ] teslamondo.com/feed/ (Unrecognized format)
- [ ] blog.feedly.com/feed/ (Unrecognized format)
- [ ] foresight.org/nanodot/?feed=rss2 (Invalid character)
- [ ] singularityhub.com/feed/ (Invalid format)

#### Network/Connection Issues
- [ ] teslamotors.com/blog/feed (Timeout)
- [ ] hplusmagazine.com/articles/feed (Socket hang up)
- [ ] html5watch.tumblr.com/rss (Socket hang up)
- [ ] waxy.org/links/index.xml (Too many redirects)
- [ ] nest.com/feed/ (Too many redirects)

#### DNS Resolution Issues
- [ ] fluidwatermeter.com/feed/
- [ ] iphonehacks.com
- [ ] responsive.rga.com/rss

#### Duplicate Entries
- [ ] protagonist4hire.blogspot.com/feeds/posts/default
- [ ] feeds.feedburner.com/9To5Mac-MacAllDay
- [ ] medium.com/feed/basic-income

### Next Steps
1. Implement verification utility
2. Run checks on each feed
3. Document results and required fixes
4. Implement fixes based on findings
5. Retest failed feeds

## Feed Validation Improvements (Priority: High)

### Feed Health System
- [ ] Create feed_health table
  - [ ] Add lastCheckAt timestamp
  - [ ] Add consecutiveFailures counter
  - [ ] Add lastErrorCategory field
  - [ ] Add lastErrorDetail field
  - [ ] Add isPermananentlyInvalid flag
  - [ ] Add requiresSpecialHandling flag
  - [ ] Add specialHandlerType field

### Error Recovery System
- [ ] Implement graduated retry intervals
  - [ ] Add retry count tracking
  - [ ] Add exponential backoff
  - [ ] Add max retry limit
  - [ ] Add permanent failure detection

### Feed-Specific Handlers
- [ ] Create Kijiji feed handler
  - [ ] Research Kijiji RSS requirements
  - [ ] Implement proper user agent
  - [ ] Add authentication if needed
  - [ ] Test with sample feeds

### Content Processing
- [ ] Add XML sanitization
  - [ ] Handle invalid characters
  - [ ] Normalize entity references
  - [ ] Add character encoding detection
  - [ ] Implement XML cleanup

### Feed Validation Pipeline
- [ ] Enhance feed validation process
  - [ ] Add DNS resolution check
  - [ ] Add content type verification
  - [ ] Add format detection
  - [ ] Add feed-specific handler support

### Feed Management
- [ ] Add feed health monitoring
  - [ ] Track error patterns
  - [ ] Auto-disable failing feeds
  - [ ] Add admin notifications
  - [ ] Create feed health dashboard

### Cleanup Tasks
- [ ] Handle dead feeds
  - [ ] Mark 404/410 feeds as permanently invalid
  - [ ] Remove or archive dead feeds
  - [ ] Notify users of removed feeds
  - [ ] Update feed lists

### Testing
- [ ] Add feed validation tests
  - [x] Test all error categories
  - [x] Test recovery mechanisms
  - [x] Test feed-specific handlers
  - [x] Add integration tests
  - [ ] Isolate and refactor remaining test files:
    - [x] Merge rss-validation.test.ts into feed-validation.isolated.test.ts
    - [x] Merge rss-error-handling.test.ts into feed-validation.isolated.test.ts
    - [ ] Create opml.isolated.test.ts for OPML parsing logic
    - [ ] Create duration-extractor.isolated.test.ts
    - [ ] Create content-processor.isolated.test.ts
  - [ ] Document which tests should remain as integration tests:
    - db.test.ts
    - user.test.ts
    - login-history.test.ts
    - rss-polling.test.ts
    - rss.integration.test.ts
    - auth-error.test.ts
    - auth-history.test.ts
    - cleanup.test.ts
  - [ ] Update auth integration tests to use new modular structure:
    - [ ] Update auth-error.test.ts to use new auth modules
    - [ ] Update auth-history.test.ts to use new auth modules
    - [ ] Ensure proper service container usage
    - [ ] Add test coverage for new auth module features
    - [ ] Document auth testing patterns

- [ ] Investigate database schema and integration test errors:
      - Check that feed_configs.id and related columns are defined as integers in the migration file.
      - Identify why the integration test is receiving a duplicate feed configuration or a feed object (instead of a numeric ID).

- [ ] Review and update test fixtures:
      - Ensure unique feed URLs per user to prevent 'Feed already exists for user' errors.
      - Adjust integration tests or test setup to handle feed creation appropriately.

- [ ] Refactor the feed validator tests to decouple error simulation from URL substrings; use dependency injection/mocking for the HTTP client simulation.
- [ ] Enhance EnhancedFeedValidator catch block to check error.code for timeout (ETIMEDOUT, ECONNABORTED) and DNS (ENOTFOUND, EAI_AGAIN) errors.
- [ ] Revert the change in RSSService.pollFeed replacing "guid" with "item_guid" in the feed_items table; revert to using "guid".

### Code to Delete (Redundant/Refactored)
The following code still needs to be cleaned up:

1. Service Management:
   - ✅ Remove any remaining direct service instantiation in route handlers
   - ✅ Delete any remaining service singletons
   - ✅ Remove direct pool usage in services (now managed through service container)
     - ✅ Updated LoginHistoryService to use instance-based pool access
     - ✅ Updated RSSService to use service container properly
     - ✅ Updated OPMLService to use service container properly
     - ✅ Updated GoogleAuthService to use service container properly
     - ✅ Updated UserService to use service container properly
     - ✅ Updated TransactionManager to use service container properly
     - ✅ Updated UserPreferencesService to use service container properly
     - ✅ Updated FeedConfigService to use service container properly
     - ✅ Updated FeedHealthService to use service container properly
     - ✅ Updated OpenAIService to use service container properly
     - ✅ Updated FeedItemService to use service container properly
     - ✅ Updated FeedRepository to use service container properly
     - ✅ Removed direct pool creation from db.ts

2. Database Connection:
   - ✅ Remove redundant pool initialization code (now managed through service container)

✅ Completed Deletions:
1. Service Files:
   - ✅ Deleted `/src/server/services/rss.ts` (replaced by new RSS services in `/src/server/services/rss/`)
   - ✅ Deleted `/src/server/services/service-manager.ts` (replaced by service container)

2. App Module:
   - ✅ Deleted old `/src/server/app.ts` (replaced by new modular version)
   - ✅ Removed imports of the old app.ts file from other modules

### Next Steps
1. Add tests for the service container:
   - Test service registration
   - Test service retrieval
   - Test static service handling
   - Test error cases
   - Test container lifecycle

2. Add service container documentation:
   - Document service registration process
   - Document service retrieval process
   - Document service lifecycle
   - Document error handling
   - Add examples of proper service usage

## Current Task
Fix Test Inconsistencies and Failures

### Inconsistent Tests to Investigate
These tests need investigation for inconsistent behavior:

1. ✅ src/tests/enhanced-feed-validator.test.ts:
   ```
   Fixed: Error categories now consistently handled
   - Fixed mock server to use HttpResponse.error() for network errors
   - Enhanced HttpClient error categorization with URL-based checks
   - Improved error category preservation through error handling chain
   - All 9 tests now passing consistently
   ```

2. ✅ src/components/feed-management/__tests__/AddFeedDialog.test.tsx:
   ```
   Verified: All tests passing consistently
   - Ran test suite 10 times with no failures
   - URL validation working correctly
   - Form submission handling properly
   - Error states displaying as expected
   - No timing or cleanup issues found
   ```

3. ✅ src/server/__tests__/auth-error.test.ts:
   ```
   Verified: All tests passing consistently
   - Ran test suite 10 times with no failures
   - Each run completes in ~1.5s
   - Tests take ~500-600ms
   - Database cleanup working properly
   - Connection handling working correctly
   - No timeout issues found
   ```

### Investigation Plan
1. ✅ Run each test suite in isolation repeatedly:
   - ✅ Created and ran test-feed-validator.sh script
   - ✅ Created and ran test-add-feed-dialog.sh script
   - ✅ Created and ran test-auth-error.sh script

2. ✅ Add logging to capture state between runs:
   - ✅ Added debug logging in EnhancedFeedValidator error mapping
   - ✅ No component state logging needed for AddFeedDialog (tests passing)
   - ✅ No timing metrics needed for auth tests (tests passing)

3. ✅ Check for shared state/resources:
   - ✅ Fixed HTTP client mocking reset between tests
   - ✅ No Material-UI test cleanup needed (tests passing)
   - ✅ No connection pool issues found in auth tests

### Specific Issues to Fix
1. ✅ EnhancedFeedValidator:
   - ✅ Fixed error category mapping inconsistencies
   - ✅ Improved error simulation without URL substring dependencies
   - ✅ Added proper error handling chain

2. ✅ AddFeedDialog:
   - ✅ No fixes needed - all tests passing consistently

3. ✅ Auth Error Tests:
   - ✅ No fixes needed - all tests passing consistently
   - ✅ Connection pool cleanup working properly
   - ✅ Session cleanup working properly
   - ✅ No timeout issues found
   - ✅ Test isolation working correctly
