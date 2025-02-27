# AI Feed Consolidator - Development Scratchpad

## Current Phase
- ✅ Fixed database configuration confusion between dev and test environments
- ✅ Addressed ES Module compatibility problems in the codebase
- ✅ Identified and fixed database connection issues related to pg-promise migration
- ✅ Completed migration from Sequelize to pg-promise for database functions
- ✅ Fixed service registration issues to get the server running successfully
- ✅ Fixed all failing tests while preserving server functionality
  - ✅ Fixed database connection issues in tests - all 246 tests now passing (with 2 skipped)!
  - ✅ Addressed database connection lifecycle issues in user-preferences, cleanup, and RSS tests
  - ✅ Implemented proper error handling and logging throughout test lifecycle
- ✅ Verified successful test suite execution (329 total tests passing - 244 server tests and 85 client tests)
- 🚧 Addressing feed polling errors in the running application

## Next Steps
- ✅ Fixed all failing tests (246 tests now passing, with 2 skipped):
  - ✅ Fixed user-preferences.test.ts:
    - ✅ Fixed "should create default preferences when getting preferences for new user" by properly handling database connection lifecycle
    - ✅ Fixed "should handle updating non-existent user preferences" by ensuring proper error handling for foreign key constraints
  - ✅ Fixed cleanup.test.ts:
    - ✅ Ensured proper database connection setup before and after each test
    - ✅ Added error recovery for database cleanup failures
  - ✅ Fixed rss.test.ts:
    - ✅ Fixed "should poll and parse RSS feed successfully" by properly initializing database connections and mock servers
    - ✅ Improved error handling and logging throughout the test
- ✅ Fixed database initialization in server startup - server now starts successfully on ports 3003 (backend) and 5173 (frontend)
- 🚧 Investigate feed polling errors in the running application
  - Error appears when trying to fetch active feeds
  - Need to examine SQL query and database schema to understand the issue
- Test main features of the application now that all tests are passing
- Document any additional issues found during testing
- Address React Query warnings about updates not wrapped in `act()`
- Examine last massive commit to see if refactoring is needed

## Unfinished Tasks from Previous Work
- Examine last massive commit to see if we need to refactor. I suspect there was a lot of redundancy/inefficiency. git commit id: 9fab75b50331cb1bd77f4ee6d769c5ccc08c1fad
- Address React Query warnings about updates not wrapped in `act()`
  - Warning appears in `useFeeds.test.ts` tests
  - Need to refactor the React Query hook tests to use `renderHook` with proper `act()` wrapping
- Improve test performance for faster execution
- Add more comprehensive tests for edge cases
- Consider implementing integration tests that verify complete user flows

## Recent Actions
- ✅ Ran full test suite - confirmed all tests are passing (329 tests total):
  - 244 server-side tests passing (with 2 skipped tests)
  - 85 client-side tests passing
  - Total execution time: ~49 seconds (server tests: 40.63s, client tests: 8.25s)
- ✅ Fixed database initialization in server startup:
  - Properly registered the database pool with the service container in src/server/index.ts
  - Resolved the circular dependency between the service container and the database initialization
  - Server now successfully connects to the database and starts up
- ✅ Started the server successfully:
  - Backend running on port 3003
  - Frontend running on port 5173
  - Confirmed successful database connection and initialization
- 🚧 Identified new issue: Feed polling errors in the running application
  - Error occurs during the initial feed poll
  - Logs show SQL query issues when attempting to fetch active feeds
  - Need to investigate if this is data-related or an implementation issue
- ✅ Fixed all remaining test failures - all 246 tests now passing (with 2 skipped)
- Fixed user-preferences.test.ts:
  - Properly registered the test suite with the database manager
  - Initialized the service container with the acquired database pool
  - Added better error handling for database cleanup operations
  - Added detailed logging for test setup and cleanup
- Fixed cleanup.test.ts:
  - Added unique test suite ID using randomUUID()
  - Implemented proper test lifecycle hooks (beforeAll, afterAll, beforeEach, afterEach)
  - Ensured the service container is properly reset between tests while maintaining the database pool
  - Added error recovery for database cleanup failures
  - Added detailed logging throughout the test
- Fixed rss.test.ts:
  - Set up proper mock server configuration using MSW
  - Added detailed test setup with database registration
  - Implemented proper initialization of the service container and test data factory
  - Added comprehensive error handling and logging
  - Created proper cleanup procedures to prevent connection issues
- Re-ran all tests to confirm all tests are now passing
- Added detailed logging throughout the test suite to improve debugging of any future issues
- Identified common patterns for successful test implementation:
  1. Register test suite with database manager using a unique ID
  2. Initialize service container with the database pool
  3. Implement proper beforeEach/afterEach hooks for cleanup
  4. Add error handling and recovery for database operations
  5. Use detailed logging throughout the test lifecycle

## Issues or Blockers
- 🚧 Feed polling errors in the running application:
  ```
  [ERROR: Error fetching feeds
      whereClause: "WHERE is_active = true
          AND (
            last_fetched_at IS NULL
            OR last_fetched_at < NOW() - (COALESCE(fetch_interval_minutes, 60) || ' minutes')::interval
          )
          AND (
            NOT EXISTS (
              SELECT 1 FROM feed_health
              WHERE feed_health.feed_config_id = feed_configs.id
              AND feed_health.is_permanently_invalid = true
            )
          )"
      params: []
      error: {}
  ```
  - Need to investigate database schema for feed_configs and feed_health tables
  - Examine SQL query optimization and error handling in feed polling
- ✅ Fixed all 3 previously failing tests with database connection issues:
  - ✅ User Preferences Test #1: Fixed by properly initializing the service container with database pool
  - ✅ User Preferences Test #2: Fixed by adding proper error handling for foreign key constraint violations
  - ✅ RSS Test: Fixed by implementing comprehensive test setup with proper database connection management
- ✅ Fixed database connection lifecycle in tests:
  - Implemented proper test suite registration with database manager
  - Added error handling and recovery for database connection issues
  - Added detailed logging to track setup and cleanup processes
  - Ensured proper cleanup between tests without destroying connections
- ✅ Fixed most database connection issues:
  - Removed direct imports of database connection in service functions
  - Ensured all database functions use the service container's managed connection
  - Fixed service registration tests to properly use test database connection
- ✅ Fixed database configuration confusion:
  - Clarified that port 5433 is used for both development and test databases
  - Added comments and documentation to avoid future confusion
- ✅ Fixed application startup issues:
  1. ✅ Fixed: Import error in enhanced-pool-manager.ts - "The requested module 'pg' does not provide an export named 'Pool'"
  2. ✅ Fixed: "Error: Service rssService not found" in service container by adding registerRSSServices call
- ✅ Fixed: "Cannot read properties of null (reading 'query')" - was a problem with database initialization sequence
- ✅ Fixed multiple service registration issues:
  1. ✅ Fixed: "Error: Service userService not found" in passport.ts
  2. ✅ Fixed: "Error: Service feedHealthService not found" in rss-service.ts
  3. ✅ Fixed: "Error: Service feedItemService not found" in feeds.ts
  4. ✅ Fixed: "Error: Service opmlService not found" in feeds.ts

## Decisions Made
- Will investigate feed polling errors in the running application:
  1. Check database schema and contents for feed_configs and feed_health tables
  2. Review SQL query for potential issues with the JOIN or WHERE conditions
  3. Improve error handling to provide more detailed information
  4. Add seed data if necessary for testing feed functionality
- Need to address React Query warnings as a future priority - not critical but would improve test quality
- Will continue testing the application's main features now that the server is running correctly
- ✅ Fixed database initialization in server by properly registering the pg-promise database instance before use
- Need to focus on the specific error patterns in the 3 remaining failing tests:
  1. For user preferences test #1: Fix database cleanup process to properly handle destroyed connection pools
  2. For user preferences test #2: Fix the test to properly create a valid user before attempting to create preferences
  3. For RSS test: Fix database initialization in TestDataFactory for the RSS test specifically
- Will examine DatabaseStateManager.cleanDatabase method at src/tests/utils/setup-test-db.ts:352
- Will fix the TestDataFactory.ensureInitialized method in src/tests/utils/factories.ts:270
- Will add better error handling and recovery for database connection issues
- Need to focus on the remaining 3 failing tests and ensure proper database connection handling
- Will examine how the RSS test is using database connections for the feed testing
- Will fix the user preferences test to handle database cleaning correctly
- Will ensure that the pool is properly shared between test suites
- Priority is now fixing test failures while preserving server functionality
- Need to investigate the test database connection lifecycle management
- Will focus on DatabaseStateManager in src/tests/utils/setup-test-db.ts first
- Will ensure that we don't reintroduce circular dependencies while fixing tests
- Standardized on PostgreSQL port 5433 for both development and test databases
- Added comprehensive documentation about database setup in multiple locations
- Prioritize fixing ES module compatibility issues over other tasks
- Fixed pg import issue using type assertions to work around TypeScript errors
- Added missing registerRSSServices call in app.ts to ensure all RSS-related services are properly registered
- Using dynamic imports instead of require() for loading migration files in ES module context
- ✅ Resolved database connection issues by properly integrating the pg-promise database instance into the existing code
- ✅ Kept backward compatibility where possible by maintaining function signatures but updating implementation
- ✅ Prioritizing getting the server running over fixing tests - tests will be addressed after confirming server functionality
- ✅ Adopted a consistent service naming convention:
  - Register services with a descriptive name (e.g., 'feedHealth')
  - Create aliases for alternative access patterns (e.g., 'feedHealthService')
  - Update the primary service container to track all registrations

## Notes
- The server is now running successfully but experiencing feed polling errors - likely a data issue rather than a connection problem
- All tests are now passing (329 total tests, including 244 server tests and 85 client tests)
- React Query tests have warnings about updates not wrapped in `act()` that should be addressed in the future
- Made significant progress on test failures - reduced from 22 to just 3 failing tests!
- ✅ Fixed the root cause: database functions in `src/server/services/db.ts` were directly importing the `db` instance from `src/server/db/db.ts`
- ✅ Major change: updating all database functions to use `getPool()` instead of `typedDb`
- The remaining 3 test failures are likely related to how specific test files are managing their database connections
- The `considerShutdown()` method in DatabaseStateManager now keeps the pool alive with message: "No active suites or connections, but keeping pool alive for future tests"
- All user and service registration tests are now passing
- The database seems to be properly set up and accessible via Docker on port 5433
- Both development database (`ai-feed-dev`) and test database (`ai-feed-test`) exist
- ✅ Identified the issue with database connections: The codebase was migrated from Sequelize to pg-promise, but there was a circular dependency in the initialization sequence
- ✅ Database initialization lessons learned:
  1. The service container expects an IDatabase object (from pg-promise) to be registered as 'pool'
  2. The original src/server/services/db.ts was trying to get the pool from the service container before it was registered
  3. A new src/server/db/db.ts file was added in the last commit that properly initializes pg-promise
  4. Our fix properly connects these components by importing and using the pg-promise database instance
- ✅ Service registration lessons learned:
  1. The service container pattern requires consistent naming conventions
  2. Services can be registered under multiple names (aliases) to maintain backward compatibility
  3. Always check both service registration and consumption points when debugging service not found errors
  4. In a dependency injection system, ensure all dependencies are properly registered before they're needed
- Test failures with "Connection pool of the database object has been destroyed" are likely due to test lifecycle management issues, not actual code problems
- The server now successfully starts on port 3003 (backend) and 5173 (frontend)

## Testing Plan
1. ✅ Fix application startup issues
   - ✅ Fixed ES module compatibility issues
   - ✅ Fixed database pool connection issue
   - ✅ Fixed service registration inconsistencies
2. ✅ Verify server starts correctly with new pg-promise implementation
3. ✅ Fix failing tests WITHOUT breaking server functionality:
   - ✅ First understand the DatabaseStateManager implementation
   - ✅ Fix database connection lifecycle in most tests
   - ✅ Ensure proper initialization and cleanup in most tests
   - ✅ Fix use of direct database connections in service functions
   - ✅ Fix remaining test failures in user-preferences and RSS tests
4. 🚧 Investigate feed polling errors in the running application
5. 🚧 Test user authentication flow
6. 🚧 Test feed management (add, edit, delete feeds)
7. 🚧 Test feed display and filtering
8. 🚧 Test content fetching from various platforms
9. 🚧 Test summary generation
10. 🚧 Test user preferences and settings

## Problems Found
1. ✅ ESM import issue with pg module in enhanced-pool-manager.ts
2. ✅ Missing rssService in the service container due to registerRSSServices not being called
3. ✅ ES Module compatibility issues with __dirname and require()
4. ✅ Database pool connection issue: "Cannot read properties of null (reading 'query')" - fixed by properly integrating pg-promise
5. ✅ Circular dependency issue in database initialization sequence - fixed by updating initialization to properly use the pg-promise instance
6. ✅ Service registration inconsistencies:
   - ✅ UserService registered as 'user' but accessed as 'userService'
   - ✅ FeedHealthService registered as 'feedHealth' but accessed as 'feedHealthService'
   - ✅ Pool accessed as 'databasePool' but registered as 'pool'
   - ✅ FeedItemService and OPMLService not registered at all
7. ✅ Test failures with "Connection pool of the database object has been destroyed":
   - ✅ Fixed all instances by:
     - ✅ Updating database service to use getPool() from service container
     - ✅ Adding proper error handling and recovery in test lifecycle methods
     - ✅ Implementing proper registration of test suites with database manager
     - ✅ Adding detailed logging throughout test execution
   - ✅ Fixed specific database connection issues in test files:
     - ✅ User preferences tests: Proper database connection lifecycle management
     - ✅ Cleanup tests: Added error recovery for database cleanup failures
     - ✅ RSS tests: Comprehensive test setup with proper mock server configuration
8. 🚧 Feed polling errors in the running application - need to investigate if these are data-related or implementation issues
   - Error occurs during initial feed poll
   - SQL query is attempting to fetch active feeds based on complex conditions
   - Empty error object suggests possible schema or data issue rather than code problem