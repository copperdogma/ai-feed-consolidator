# AI Feed Consolidator Todo List

20240119: Created by Cam Marsollier with Claude 3.5 Sonnet

## High Priority (MVP Phase)

### Authentication & Security
- Database Integration for Authentication
  - [ ] Set up PostgreSQL schema for users
  - [ ] Implement user profile storage
  - [ ] Add login history tracking
  - [ ] Create user preferences table

- Enhanced Security Features
  - [ ] Implement CSRF protection
  - [ ] Add rate limiting for auth endpoints
  - [ ] Set up audit logging
  - [ ] Configure production cookie settings

- Production Deployment Setup
  - [ ] Configure HTTPS endpoints
  - [ ] Set up production environment variables
  - [ ] Configure secure session management
  - [ ] Implement proper error handling

### Infrastructure
- Docker Configuration
  - [ ] Create application Dockerfile
  - [ ] Set up Docker Compose for local development
  - [ ] Configure PostgreSQL container

- Development Environment
  - [ ] Configure MUI and React Query
  - [ ] Set up basic web UI scaffold
  - [ ] Create responsive layout
  - [ ] Implement basic navigation

- Deployment
  - [ ] Configure fly.io deployment
  - [ ] Set up PostgreSQL instance
  - [ ] Configure environment variables

### Content Integration
- Research and evaluate auto-news project
  - [ ] Focus on Docker deployment approach
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
  - [ ] Research existing open-source solutions
  - [ ] Implement transcript extraction service
  - [ ] Design LLM prompt for video summarization
  - [ ] Implement caching layer for summaries

- Additional Platforms
  - [ ] Configure X API for Bookmarks
  - [ ] Set up Feedly API for Saved Items
  - [ ] Design email integration
  - [ ] Set up URL extraction

### Core Features
- Summary Generation System
  - [ ] Level 1: Core points extractor
  - [ ] Level 2: Detailed overview generator
  - [ ] Implement caching layer
  - [ ] Set up database in Docker volume

## Medium Priority
- [ ] Design and implement personal sync system
- [ ] Add offline support
- [ ] Implement basic search

## Low Priority
- [ ] Family account support
- [ ] Enhanced topic management
- [ ] Progressive Web App features
- [ ] Export functionality

## Future Enhancements
- [ ] Improved search capabilities
- [ ] Additional content sources
- [ ] Native mobile apps
- [ ] Shared family features

## Bugs
- No known bugs 