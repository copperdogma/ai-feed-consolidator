20240120: Created by Cam Marsollier with Claude 3.5 Sonnet

# AI Feed Consolidator Todo List

## High Priority (MVP Phase)
- Set up project infrastructure
  - Create Docker configuration
    - Application Dockerfile
    - Docker Compose for local development
    - PostgreSQL container configuration
  - Set up development environment
    - Initialize React + TypeScript project with Vite
    - Configure MUI and React Query
    - Set up ESLint and Prettier
    - Configure hot reloading
  - Configure fly.io deployment
    - Application deployment
    - PostgreSQL instance setup
    - Environment variables
  - Create basic web UI scaffold
    - Set up MUI theme
    - Create responsive layout
    - Implement basic navigation
- Research and evaluate auto-news project (https://github.com/finaldie/auto-news) integration possibilities
  - Focus on their Docker deployment approach
  - Review their platform integration approaches (YouTube, RSS, etc.)
  - Evaluate their two-level insight generation system
  - Study their content filtering and noise reduction strategies
- Set up OpenAI integration
  - Configure personal API key management
  - Create summary generation prompts
  - Build local caching system
  - Set up cost monitoring
- Configure personal API access
  - Set up YouTube API access for Watch Later
  - Configure X API for Bookmarks
  - Set up Feedly API for Saved Items
- Design and implement personal email integration
  - Configure email filters
  - Set up URL extraction
  - Define personal priority system
- Develop two-level summary generation system
  - Level 1: Core points extractor
  - Level 2: Detailed overview generator
- Create responsive web UI
  - Design mobile-friendly interface
  - Implement topic organization
  - Build content viewer
- Implement persistent storage
  - Set up database in Docker volume
  - Configure backup system
  - Implement caching layer

## Medium Priority
- Design and implement personal sync system
- Add offline support
- Set up personal authentication
- Implement basic search

## Low Priority
- Family account support
- Enhanced topic management
- Progressive Web App features
- Export functionality

## Future Enhancements
- Improved search capabilities
- Additional content sources
- Native mobile apps
- Shared family features

## Bugs
- No known bugs

## High Priority

### YouTube Integration
- [ ] Research existing open-source solutions
  - Search for GitHub projects handling YouTube transcript extraction
  - Evaluate existing summarization approaches
  - Document findings in design.md
  - Consider potential libraries for integration
- [ ] Implement YouTube transcript extraction service
  - Research YouTube Data API transcript endpoints
  - Handle both auto-generated and manual transcripts
  - Support multiple languages
  - Implement fallback for videos without transcripts
- [ ] Design LLM prompt for video summarization
  - Create prompt template for two-level summaries
  - Optimize token usage
  - Handle long transcripts efficiently
- [ ] Implement caching layer for summaries
  - Design cache schema
  - Set up cache invalidation rules
  - Track summary generation costs 