# Docker Architecture Overview

20240422: Created by Cam Marsollier with Claude 3.5 Sonnet
20240120: Updated by Cam Marsollier with Claude 3.5 Sonnet for AI Feed Consolidator project

## Overview
AI Feed Consolidator uses Docker to package the application stack (React frontend + Node.js API + PostgreSQL database) for both local development and production deployment. This containerization strategy provides consistent environments and simplified deployment to fly.io.

## Why Docker?
- **Unified Stack**: Packages React app, Node.js API, and development database together
- **Cost Efficiency**: Leverages fly.io's native PostgreSQL support
- **Development/Production Parity**: Same configuration across environments
- **Simplified Deployment**: Streamlined deployment to fly.io
- **Complete Environment**: Access to all required tools and dependencies

## Container Architecture

### Core Components
- React 18 frontend (Vite + TypeScript)
- Node.js 18 API server
- PostgreSQL database
- Supervisor process manager

### Build Process
The Dockerfile uses a multi-stage build to optimize the final image:
1. **Base Stage**: Node.js 18 environment
2. **Build Stage**: Compiles frontend and backend
3. **Production Stage**: Minimal runtime with built assets

### Process Management
Supervisor manages multiple processes within the container:
- Node.js API server
- Static file serving for React app
- Process monitoring and auto-restart
- Unified logging

### Data Management
PostgreSQL database management:
- **Development**: Local Docker container
- **Production**: fly.io managed PostgreSQL
- Regular backups via fly.io tooling
- See `fly-postgres-guide.md`

### Directory Structure
- `/app` - Application root
  - `/app/frontend` - React application
  - `/app/backend` - Node.js API
- `/data` - Persistent storage

### Configuration Files
- `infra/Dockerfile` - Container definition
- `infra/supervisord.conf` - Process management
- `infra/start.sh` - Container startup
- `docker-compose.yml` - Development config
- `docker-compose.override.yml` - Local overrides
- `.dockerignore` - Build optimization rules

### Port Mappings
- 3000: React development server
- 5000: Node.js API (development)
- 8080: Production server (both frontend and API)
- 5432: PostgreSQL

## Development vs Production

### Development Environment
- Hot module replacement for React
- Code mounted from host filesystem
- Local PostgreSQL database
- API auto-restart on changes
- See `commands-reference.md` for development commands

### Production Environment
- Static React build served by Node.js
- fly.io managed PostgreSQL
- Optimized multi-stage build
- Environment-specific configurations
- See `fly-deployment-guide.md` for deployment details

## Resource Management
- Container memory: 512MB
- Shared CPU allocation
- Auto-scaling configuration in fly.io
- PostgreSQL resources managed by fly.io
- See `fly-postgres-guide.md` for database resources

## Documentation Index
- **Docker Setup/Commands**: `commands-reference.md`
- **Deployment Process**: `fly-deployment-guide.md`
- **PostgreSQL Management**: `fly-postgres-guide.md` 