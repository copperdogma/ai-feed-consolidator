# Technical Design Document

20240120: Created by Cam Marsollier with Claude 3.5 Sonnet
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to align with AI Feed Consolidator specification
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to add code quality tools configuration
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to add Google OAuth configuration
20240205: Updated by Cam Marsollier with Claude 3.7 Sonnet to add Firebase Authentication implementation

# AI Feed Consolidator Technical Design

## Architecture Overview
### High-Level Components
- Content Integration Service
  - Platform-specific adapters (YouTube, RSS, X, Email, Slack)
  - Authentication management
  - Sync orchestration
- Content Processing Pipeline
  - Content extraction
  - Summary generation (2-level system)
  - Topic detection
  - Metadata enrichment
- Storage Layer
  - Content store
  - User preferences
  - Historical data
- API Layer
  - Platform integration endpoints
  - Content management
  - User operations
- Web Interface
  - Content views
  - Topic management
  - Priority controls

## System Components
### Content Integration Service
- Platform-specific OAuth handlers
- Rate limiting and quota management
- Sync status tracking
- Failure recovery mechanisms

### Summary Generation System
- Concise Summary Generator
  - 1-3 sentence format
  - Answer-Forward validation
  - Content type optimization
  - Token usage efficiency
- ChatGPT Integration
  - Direct deep analysis option
  - Custom analysis prompts
  - User-controlled exploration
- Time estimation engine
- Content type detection

### Topic Management System
- Automatic categorization engine
- Topic hierarchy manager
- Cross-platform topic alignment
- Priority inheritance system

### Historical Data Manager
- Efficient storage strategy
- Search indexing
- Activity tracking
- Performance optimization

## Data Flow
1. Content Acquisition
   - Platform polling/webhooks
   - Email processing
   - Authentication validation
   - Rate limit management

2. Content Processing
   - Content extraction
   - Summary generation
   - Topic detection
   - Metadata enrichment

3. Storage and Indexing
   - Content persistence
   - Search indexing
   - Historical tracking
   - Activity logging

4. User Interface
   - Content presentation
   - User interactions
   - Priority management
   - Topic organization

## Technical Decisions
### Technology Stack
[To be determined based on implementation requirements]
Key considerations:
- Summary generation capabilities
- Real-time sync requirements
- Storage scalability
- UI responsiveness

### Logging Strategy
The application uses Pino for structured logging with a centralized logger configuration:

- **Logger Implementation**
  - Centralized logger in `src/server/logger.ts`
  - Shared instance across all modules
  - Multi-target output (console and file)
  - Structured JSON logging with pretty printing

- **Configuration Details**
  ```typescript
  {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        {
          target: 'pino-pretty',  // Console output
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        },
        {
          target: 'pino/file',    // File output
          options: { 
            destination: './logs/app.log',
            mkdir: true
          }
        }
      ]
    }
  }
  ```

- **Log Categories**
  - Authentication events (login, logout, session management)
  - Database operations (queries, connections, transactions)
  - API requests/responses (via pino-http middleware)
  - Application lifecycle (startup, shutdown, errors)
  - Error tracking (with full stack traces and context)

- **Development Features**
  - Pretty-printed console output for readability
  - Automatic log directory creation
  - Full error stack traces
  - Request/response logging with pino-http

- **Production Features**
  - JSON format for log aggregation
  - File-based logging with rotation
  - Error context preservation
  - Performance optimized transport

- **Environment Configuration**
  - `LOG_LEVEL`: Controls logging verbosity (default: 'info')
  - `NODE_ENV`: Affects logging format and detail
  - Configurable log file location
  - Customizable pretty-print options

### Data Storage
Requirements:
- Support for 10,000+ items
- Fast topic-based queries
- Efficient historical access
- Activity tracking
- Full-text search

### Database Strategy
- PostgreSQL for robust relational storage
- Raw SQL with pg-promise for type-safe database operations

### Database Migration Strategy
The project uses raw SQL migrations for database schema management:
- Single migration file with all schema definitions
- Custom migration runner with validation and safety checks
- Support for dry-run and backup operations

## Security Considerations
- OAuth token management
- API key security
- User data protection
- Platform credential isolation
- Rate limit enforcement

## Performance Considerations
- <30 second platform sync
- <5 second summary generation
- Responsive UI with 10,000+ items
- Efficient historical data access
- Topic calculation optimization
- Search performance 

## YouTube Integration Implementation

### Video Summarization
Based on QuickTube's proven approach:
1. Extract video transcript using YouTube's transcript API
2. Process transcript through LLM (GPT-4/3.5) for summarization
3. Present two-level summary as specified in requirements

#### Implementation Alternatives

1. Direct YouTube Data API Integration
   - Pros: Full control, direct access to official API
   - Cons: Need to handle quotas, authentication
   - Components:
     - youtube-transcript-api or similar library
     - Custom transcript processing
     - Direct LLM integration

2. Existing Open Source Solutions
   - youtube-transcript-api (https://github.com/jdepoix/youtube-transcript-api)
     - Python library for transcript extraction
     - Supports multiple languages
     - Handles auto-generated captions
     - Active maintenance and community
   - youtube-summarizer (https://github.com/sabber-slt/youtube-summarizer)
     - Combines transcript extraction with GPT summarization
     - Similar approach to QuickTube
     - MIT licensed, can use as reference
   - youtube-transcript (https://github.com/algolia/youtube-captions-scraper)
     - Node.js implementation
     - Used by production services
     - Good error handling

3. Hybrid Approach (recommended)
   - Use youtube-transcript-api for reliable transcript extraction
   - Custom implementation for:
     - Summary generation with our two-level system
     - Caching and cost optimization
     - Integration with our platform
   - Benefits:
     - Proven transcript extraction
     - Control over summarization quality
     - Optimized for our use case

Key components needed:
- YouTube Data API integration for video metadata
- Transcript extraction service
- LLM prompt engineering for effective summarization
- Caching layer for generated summaries

Implementation considerations:
- Handle videos without transcripts
- Support multiple languages
- Optimize token usage for cost efficiency
- Cache summaries to prevent redundant API calls 

## Technology Stack

### Frontend
- **React 18** - Component-based UI library for building interactive interfaces
- **TypeScript** - Static typing for improved development experience and code quality
- **Vite** - Modern build tool and dev server offering:
  - ES modules for fast development
  - On-demand compilation
  - Hot Module Replacement (HMR)
- **Material-UI (MUI)** - React component library implementing Material Design
- **React Query** - Data-fetching and state management library

### Code Quality Tools
- **ESLint** - Static code analysis
  - TypeScript and React specific rules
  - Integration with Prettier
  - Custom rule configuration for project needs
- **Prettier** - Code formatting
  - Consistent code style
  - 100 character line length
  - Single quotes
  - 2 space indentation

### Backend & Database
- **PostgreSQL 16** - Robust relational database for structured data storage
- **Node.js 20** - JavaScript runtime for the application server

### Development Environment
- **Docker** - Containerization for consistent development and deployment
  - Multi-container setup with docker-compose
  - Separate containers for app and database
  - Volume mounts for hot-reloading
- **Development Ports**:
  - Frontend: 5173 (Vite dev server)
  - Database: 5433 (mapped from internal 5432)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Application environment setting

## Development Setup
The application uses a Docker-based development environment:
```yaml
services:
  app: # Frontend + Backend container
    - Port 5173 exposed for development
    - Volume mounted for hot-reloading
    - Node.js 20 slim image
  
  db: # PostgreSQL container
    - Version 16
    - Persistent volume for data storage
    - Port 5433 exposed for external connections
```

## Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking
- `npm run preview` - Preview production build

## Architecture Decisions

### ADR 1: Docker-based Development Environment
**Context**: Need for consistent development environment across machines.

**Decision**: Use Docker with docker-compose for local development.

**Consequences**:
- Pros:
  - Consistent environment for all developers
  - Isolated services
  - Easy service orchestration
  - Production-like environment locally
- Cons:
  - Additional layer of complexity
  - Potential performance overhead
  - Learning curve for Docker

### ADR 2: Vite over Create React App
**Context**: Need for a modern, fast development environment.

**Decision**: Use Vite instead of Create React App.

**Consequences**:
- Pros:
  - Faster development server startup
  - Better hot module replacement
  - Modern ES modules approach
  - More configurable
- Cons:
  - Newer tool with smaller community
  - Different build approach from CRA 

## Authentication Design

### Google OAuth 2.0 Configuration
- **Project Setup**:
  - Dedicated Google Cloud Project for isolation
  - External user type for broader access
  - Production-ready configuration with security best practices

- **OAuth Consent Screen**:
  - App Name: "AI Feed Consolidator"
  - User Type: External
  - Authorized Domains: 
    - Development: localhost
    - Production: TBD

- **OAuth Scopes**:
  - Basic Profile (`openid`, `profile`, `email`)
  - Additional scopes to be added incrementally as needed

- **Security Configuration**:
  - Authorized JavaScript Origins:
    - Development: `http://localhost:5173`
    - Production: TBD
  - Authorized Redirect URIs:
    - Development: `http://localhost:5173/auth/google/callback`
    - Production: TBD

- **Environment Variables**:
  - Client ID and Secret stored in `.env`
  - Example template in `.env.example`
  - Excluded from version control
  - Different configurations for dev/prod

- **Security Considerations**:
  - Credentials stored as environment variables
  - `.env` files excluded from git
  - Session secret for cookie encryption
  - CSRF protection implemented
  - Refresh token handling
  - Secure cookie configuration 

## Authentication System

### Overview
The application uses Google OAuth 2.0 for authentication, providing a secure and familiar login experience. This choice was made to:
- Leverage Google's robust security infrastructure
- Simplify user onboarding (no new passwords to remember)
- Access Google services (YouTube, etc.) with proper authorization

### Architecture
1. **Frontend (React + Vite)**
   - Handles authentication state management
   - Provides login/logout UI
   - Makes authenticated API calls to backend
   - Uses proxy configuration to handle OAuth redirects

2. **Backend (Express + Passport)**
   - Manages OAuth flow with Google
   - Handles session management
   - Provides protected API endpoints
   - Uses CORS for secure frontend communication

3. **Session Management**
   - Server-side sessions using `express-session`
   - Cookie-based session tracking
   - Secure session configuration for production

### Security Measures
1. **Development Environment**
   - CORS configured for local development
   - Session cookies set for HTTP in development
   - Environment variables for sensitive data

2. **Production Requirements**
   - HTTPS required for all endpoints
   - Secure cookie settings
   - CSRF protection
   - Rate limiting
   - Regular session secret rotation

### Data Flow
1. User clicks "Log in with Google" button
2. Frontend redirects to `/api/auth/google`
3. Backend initiates OAuth flow with Google
4. Google redirects to `/api/auth/google/callback` with auth code
5. Backend exchanges code for tokens and creates/updates user
6. User is redirected back to frontend with session cookie

### Future Enhancements
1. **Database Integration**
   - Store user profiles
   - Track login history
   - Manage user preferences

2. **Enhanced Security**
   - Implement CSRF tokens
   - Add rate limiting
   - Set up audit logging

3. **Additional Auth Features**
   - Email verification
   - Account linking
   - Role-based access control

### Firebase Authentication
- Client-side implementation
  - Firebase SDK for web authentication
  - Google authentication provider
  - Token-based authentication
  - Auth state management with React context
- Server-side implementation
  - Firebase Admin SDK for token verification
  - Express middleware for authentication
  - User management in PostgreSQL database
  - Session management with JWT tokens

#### Authentication Flow
1. User initiates sign-in with Google through Firebase Authentication
2. Firebase handles OAuth flow and returns Firebase user and ID token
3. Client sends ID token to server for verification
4. Server verifies token using Firebase Admin SDK
5. Server finds or creates user in database based on Firebase user ID
6. Server returns user data to client
7. Client stores authentication state in React context
8. Protected routes check authentication state before rendering

#### Firebase Configuration
- Client-side configuration in `src/firebase/config.ts`
- Authentication service in `src/firebase/auth.ts`
- Server-side Firebase Admin in `src/server/auth/firebase-admin.ts`
- Authentication middleware in `src/server/auth/middleware.ts`
- Authentication routes in `src/server/routes/auth.ts`

#### Security Considerations
- ID tokens are short-lived (1 hour by default)
- Tokens are verified on every request to protected routes
- User data is stored securely in PostgreSQL database
- Sensitive operations require re-authentication
- Login history is tracked for security monitoring

## API Design

[To be continued with API documentation...] 

## Feed Service Implementations

### RSS Feed Management
The application directly manages RSS feeds without relying on third-party aggregators. This provides more control and flexibility while avoiding enterprise API limitations.

#### Core Components

1. Feed Management
   - Manual feed addition/removal
   - Feed validation and health checks
   - Feed metadata storage
   - Feed polling system
   - Optional OPML import support (future)

2. Feed Processing
   - Regular feed polling (configurable intervals)
   - Content deduplication
   - HTML content extraction
   - Media detection and metadata extraction

3. Feed Storage
   - Feed configuration storage
   - Item persistence
   - Read/unread state tracking
   - Local save/bookmark functionality

#### Feed Item Structure
Required fields:
- `id`: Unique identifier for the item
- `source_id`: Original item ID (e.g., GUID)
- `source_type`: Feed source type (e.g., "rss")
- `title`: Article title
- `content`: Full article content (HTML)
- `summary`: Brief content summary
- `author`: Content author
- `published_at`: Publication timestamp
- `url`: Original article URL
- `read`: Boolean indicating read status
- `saved`: Boolean indicating saved status

Optional fields:
- `language`: Content language code (e.g. "en")
- `read_time`: Estimated reading time
- `media`: Array of media items (images, videos)
- `topics`: Extracted topic tags

#### Implementation Details

1. Feed Polling
   - Background job runs every 5 minutes
   - Checks for feeds due for update
   - Configurable per-feed polling intervals
   - Error tracking and health monitoring

2. Content Processing
   - HTML sanitization and cleanup
   - Media extraction and metadata
   - Content type detection
   - Language detection

3. Error Handling
   - Feed validation on addition
   - Retry logic for failed fetches
   - Error count tracking
   - Feed health monitoring
   - Robust database query error handling
   - Comprehensive logging for debugging
   - Null/undefined checks for all external data
   - Graceful degradation on failure

### Error Handling Best Practices

Based on our experience with the feed polling system, we've established these error handling principles:

1. **Defensive Programming**
   - Always check for null/undefined values when processing external data
   - Use optional chaining and nullish coalescing operators for safer access
   - Implement proper type checking before accessing properties
   - Add guard clauses at the beginning of functions to handle edge cases

2. **Comprehensive Logging**
   - Log detailed error information including context and stack traces
   - Use structured logging with proper error objects
   - Include relevant parameters and query information
   - Add debug logging for complex operations to aid troubleshooting
   - Log both the error message and the complete error object

3. **Graceful Degradation**
   - Design systems to continue functioning when components fail
   - Implement fallback mechanisms for critical operations
   - Return sensible defaults when operations fail
   - Avoid cascading failures by isolating error-prone components

4. **Error Classification**
   - Categorize errors by type and severity
   - Handle different error types appropriately
   - Distinguish between recoverable and non-recoverable errors
   - Implement specific handling for common error scenarios

5. **Testing Error Scenarios**
   - Create comprehensive tests for error conditions
   - Mock failure scenarios to verify error handling
   - Test edge cases like empty results and malformed data
   - Verify logging and error reporting in tests

Example implementation:
```typescript
async function safeOperation() {
  try {
    // Attempt the operation
    const result = await performOperation();
    
    // Verify result integrity
    if (!result || !result.data) {
      logger.warn('Operation returned incomplete data', { result });
      return getDefaultValue();
    }
    
    return processResult(result);
  } catch (error) {
    // Log detailed error information
    logger.error('Operation failed', { 
      error, 
      operation: 'performOperation',
      context: getCurrentContext()
    });
    
    // Handle specific error types
    if (error instanceof DatabaseError) {
      await reconnectDatabase();
      return getDefaultValue();
    }
    
    // Return sensible default for other errors
    return getDefaultValue();
  }
}
```

4. Performance Optimization
   - Efficient polling scheduling
   - Content deduplication
   - Conditional fetching
   - Response caching 

## OPML Import Error Analysis (20240427)

### Error Categories
1. HTTP Status Errors
   - 404: Resource not found
   - 403: Access forbidden
   - 410: Gone permanently
2. Certificate/SSL Issues
   - Hostname/IP mismatch
   - Certificate validation failures
3. Feed Format/Parsing Issues
   - Invalid XML
   - Unrecognized feed format
   - Malformed content
4. Duplicate Entry Issues
   - Constraint violations on user_id + feed_url
5. Network/Connection Issues
   - Timeouts
   - Connection resets
   - DNS resolution failures
6. XML Parsing Errors
   - Invalid characters
   - Malformed structure

### Verification Process
1. For each feed URL:
   a. Attempt direct HTTP GET with appropriate headers
   b. If successful, validate feed format
   c. Log results with specific error categorization
   d. For valid feeds with parsing errors, capture sample content for analysis

### Test Implementation Plan
1. Create a test utility that:
   - Takes a list of feed URLs
   - Attempts to fetch and parse each one
   - Provides detailed diagnostics
   - Categorizes errors according to above schema
   - Saves results for analysis

2. Error Resolution Strategies:
   - HTTP Status Errors: Mark as permanently failed if 404/410
   - SSL Issues: Implement proper cert validation handling
   - Format Issues: Enhance parser robustness
   - Duplicates: Improve pre-check logic
   - Network Issues: Implement retry with backoff
   - XML Issues: Add feed format normalization

3. Success Criteria:
   - Each feed categorized as either:
     * Permanently invalid (dead feed)
     * Temporarily unavailable (retry candidate)
     * Valid but failing parse (needs code fix)
     * Duplicate (needs deduplication logic) 

## Feed Validation Analysis Results (20240427)

### Summary
- Total Feeds Tested: 46
- Valid Feeds: 6 (13%)
- Invalid Feeds: 40 (87%)

### Error Categories and Solutions

1. HTTP Status Errors (28 feeds, 61%)
   - Kijiji Feeds (403):
     * Issue: All Kijiji feeds return 403 Forbidden
     * Solution: Implement special handling with proper user agent and headers
     * Recommendation: Create a Kijiji-specific adapter with authentication
   
   - Dead Feeds (404/410):
     * Issue: Several feeds permanently gone or moved
     * Solution: Mark as permanently invalid
     * Recommendation: Implement feed health monitoring to detect and remove dead feeds

2. Network Errors (6 feeds, 13%)
   - Issues:
     * DNS resolution failures
     * Connection timeouts
     * Fetch failures
   - Solutions:
     * Implement retry logic with exponential backoff
     * Add DNS caching
     * Monitor for persistent failures
     * Consider proxy service for problematic feeds

3. Parse/Format Errors (6 feeds, 13%)
   - Issues:
     * Invalid XML characters
     * Unrecognized feed formats
     * HTML instead of RSS/XML
   - Solutions:
     * Add XML sanitization
     * Implement format detection
     * Add support for additional feed formats
     * Consider HTML-to-RSS conversion for certain sources

### Implementation Recommendations

1. Feed Health System
   ```typescript
   interface FeedHealth {
     lastCheckAt: Date;
     consecutiveFailures: number;
     lastErrorCategory: string;
     lastErrorDetail: string;
     isPermananentlyInvalid: boolean;
     requiresSpecialHandling: boolean;
     specialHandlerType?: string;
   }
   ```

2. Error Recovery Strategy
   - Implement graduated retry intervals
   - Add feed-specific handlers for problematic sources
   - Track error patterns for feed categorization
   - Auto-disable feeds after persistent failures

3. Feed Validation Pipeline
   ```
   Input Feed URL
   ↓
   DNS Resolution Check
   ↓
   HTTP Status Validation
   ↓
   Content Type Verification
   ↓
   XML/RSS Format Validation
   ↓
   Feed-Specific Handler (if needed)
   ↓
   Content Extraction
   ```

## Application Verification and Testing

Based on our experience with the feed polling system, we've established these verification principles:

### Verification Approaches

1. **Log-Based Verification**
   - Always verify application behavior by checking logs, not just by running tests
   - Use structured logging to make log analysis easier
   - Include context information in logs for better debugging
   - Add debug logs for complex operations to aid troubleshooting

2. **Multi-Level Testing**
   - Unit tests for individual components
   - Integration tests for component interactions
   - End-to-end tests for complete workflows
   - Test both success and failure scenarios
   - Test edge cases and boundary conditions

3. **Test Environment Management**
   - Ensure test environment closely matches production
   - Reset test environment between test runs
   - Use proper database cleanup procedures
   - Manage test data carefully to avoid test interference

4. **Continuous Verification**
   - Run tests automatically on code changes
   - Monitor application logs in development and production
   - Implement health checks for critical components
   - Set up alerts for unexpected behavior

### Best Practices

1. **Running the Application**
   - Run the application in development mode to verify behavior
   - Check logs for errors and unexpected behavior
   - Verify database connections and operations
   - Monitor resource usage and performance

2. **Testing Edge Cases**
   - Test with empty databases
   - Test with malformed data
   - Test with unexpected input
   - Test with resource constraints

3. **Debugging Techniques**
   - Add temporary debug logs for troubleshooting
   - Use structured logging for better analysis
   - Check database state during operations
   - Monitor network requests and responses

Example verification workflow:
```bash
# Clear logs before starting
echo "" > logs/app.log

# Start the application
npm run dev &

# Wait for application to initialize
sleep 5

# Check logs for errors
grep -i error logs/app.log

# Verify expected behavior
grep -i "Server listening" logs/app.log
grep -i "Connected to database" logs/app.log

# Monitor ongoing operations
tail -f logs/app.log
```

## Test Setup Process