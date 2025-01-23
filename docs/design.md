# Technical Design Document

20240120: Created by Cam Marsollier with Claude 3.5 Sonnet
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to align with AI Feed Consolidator specification
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to add code quality tools configuration
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet to add Google OAuth configuration

# AI Feed Consolidator Technical Design

## Architecture Overview
### High-Level Components
- Content Integration Service
  - Platform-specific adapters (YouTube, X, Feedly, Email, Slack)
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

### API Design
- RESTful endpoints for:
  - Platform integration
  - Content management
  - User preferences
  - Topic operations
- WebSocket for:
  - Real-time updates
  - Sync status
  - Priority changes

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
1. User clicks "Sign in with Google"
2. Frontend redirects to `/auth/google`
3. Backend initiates OAuth flow
4. Google displays consent screen
5. User approves access
6. Google redirects to callback URL
7. Backend creates session
8. User redirected to frontend
9. Frontend fetches user data

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

## API Design

[To be continued with API documentation...] 

## Feed Service Implementations

### Feedly

#### API Response Structure

The Feedly API returns an array of feed items with the following structure:

Required fields:
- `id`: Unique identifier for the item
- `title`: Article title
- `content`: Full article content (HTML)
- `summary`: Brief content summary
- `author`: Content author
- `published`: Publication timestamp
- `origin`: Source information including title and URL
- `keywords`: Topic tags array
- `categories`: User-defined categories
- `tags`: System tags (e.g. "read", "saved")

Optional fields:
- `canonicalUrl`: Original article URL
- `language`: Content language code (e.g. "en")
- `readTime`: Estimated reading time
- `visual`: Image metadata including URL and dimensions
- `engagement`: Engagement metrics
- `engagementRate`: Normalized engagement score

This structure will need to be normalized into our common feed item format for consistent processing across different feed sources. 