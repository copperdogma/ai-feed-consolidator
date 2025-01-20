# PostgreSQL Database Overview

20240422: Created by Cam Marsollier with Claude 3.5 Sonnet

## Overview
AI Feed Consolidator uses PostgreSQL for its primary relational database, managed through the Sequelize ORM. The database stores user data, conversations, messages, and other core application data. We maintain separate databases for development, testing, and production environments.

## Architecture

### Database Setup
- **Development**: Local PostgreSQL instance
- **Testing**: Local PostgreSQL test database
- **Production**: fly.io managed PostgreSQL service

### ORM Layer
- Sequelize ORM for database interactions
- Migration-based schema management
- Models defined in `/models` directory
- Configurations in `config/sequelize-config.js`

## Database Schema

### Core Tables
1. **user**
   - Primary key: UUID
   - Stores: person_id (graph node key), settings (JSON)
   - Relationships: One-to-many with conversations, messages

2. **federated_credentials**
   - Primary key: UUID
   - Foreign key: user_id
   - Stores: provider, subject
   - Unique index: [provider, subject]

3. **user_login**
   - Primary key: UUID
   - Foreign key: user_id
   - Stores: login_type, login_result
   - Types: google-oidc
   - Results: success, incorrectPassword, userNotFound, lockedOut, accountDisabled

4. **conversation**
   - Primary key: UUID
   - Foreign key: user_id
   - Stores: title, is_title_user_locked, start_type, is_sensitive
   - Start types: chat, email, text, video, upload
   - Index: user_id

5. **message**
   - Primary key: UUID
   - Foreign keys: user_id, conversation_id, media_id
   - Stores: source, role, is_sensitive, data_summary, text
   - Sources: chat, email, text, facebook
   - Roles: assistant, user
   - Index: [user_id, conversation_id, media_id]

6. **media**
   - Primary key: UUID
   - Foreign keys: user_id, message_id
   - Stores: object_type, file_size, file_format, checksum, blob_location
   - Object types: audio, video, photo, pdf
   - Index: [user_id, message_id]

7. **person_source**
   - Primary key: UUID
   - Foreign keys: user_id, conversation_id, message_id
   - Stores: person_id, source, source_data
   - Purpose: Archive original data sources
   - Index: user_id

### Views
- **conversation_message_search_view**
  - Combines conversation titles and message text
  - Used for full-text search across conversations and messages

### Key Features
- All tables use UUID primary keys
- Timestamps (created_at, updated_at) on most tables
- Cascading deletes for referential integrity
- Extensive use of foreign key constraints
- Strategic indexing for query performance

### Graph Integration
- Person entities stored in graph database
- SQL tables maintain source references
- person_id links SQL and graph records
- Hybrid approach optimizes for different data types

## Local Development Setup

### Installation
```bash
# Install PostgreSQL 14
brew install postgresql@14

# Initialize database
initdb -D /usr/local/var/postgresql@14

# Start and enable at login
brew services start postgresql@14

# Create development database
createdb dev-ai-feed-consolidator-db
```

### Connection Details
- Database: `dev-ai-feed-consolidator-db`
- User: System username (no password)
- Socket: `/tmp`
- Port: `5432`
- Connection: Unix socket authentication
- Timezone: UTC (required for JS Date compatibility)

### Development Tools
1. **TablePlus** (Recommended)
   - Lightweight GUI client
   - Easy connection management
   - Query execution and visualization

2. **CLI Tools**
   - `psql dev-ai-feed-consolidator-db` for direct database access
   - Sequelize CLI for migrations
   - See `commands-reference.md` for common commands

3. **VS Code Integration**
   - PostgreSQL extension by Chris Kolkman
   - Database explorer and query execution

## Database Management

### Migrations
- Located in `/migrations` directory
- Managed via Sequelize CLI
- Tracked in `SequelizeMeta` table
- Run automatically on deployment
- See `commands-reference.md` for migration commands

### Naming Conventions
- Migration files: `YYYYMMDDHHMMSS-version-description.js`
- Example: `20240319142025-v0.5.1-add-fields-to-conversation.js`

### Environment Configuration
1. **Development**
   ```javascript
   {
     use_env_variable: 'DB_CONNECTION_STRING_DEV',
     dialect: 'postgres'
   }
   ```

2. **Testing**
   ```javascript
   {
     use_env_variable: 'DB_CONNECTION_STRING_TEST',
     dialect: 'postgres'
   }
   ```

3. **Production**
   ```javascript
   {
     use_env_variable: 'DB_CONNECTION_STRING_PROD',
     dialect: 'postgres'
   }
   ```

## Production Database

### Connection Methods
1. **Direct Connection**
   - Via fly.io proxy
   - Requires active proxy session
   - Used by TablePlus and other tools

2. **Application Connection**
   - Via internal fly.io network
   - Uses connection string from environment
   - Automatic SSL/TLS handling

### Proxy Setup for Tools
```bash
# Start proxy (keep terminal open)
flyctl proxy 15432:5432 -a ai-feed-consolidator-postgres

# TablePlus Connection Settings
Host: localhost
Port: 15432
Database: postgres
Username: postgres
Password: (from DB_PASSWORD_PROD)
```

## Database Operations

### Reset Database (Development Only)
```sql
-- Kill all connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'dev-ai-feed-consolidator-db'
  AND pid <> pg_backend_pid();

-- Drop and recreate
DROP DATABASE IF EXISTS "dev-ai-feed-consolidator-db";
CREATE DATABASE "dev-ai-feed-consolidator-db";
```

### Common Tasks
- Schema updates via migrations
- Data backups (see `fly-postgres-guide.md`)
- Connection management
- Query optimization
- See `commands-reference.md` for specific commands

## Documentation Index
- **Commands & Operations**: `commands-reference.md`
- **Production Setup**: `fly-postgres-guide.md`
- **Deployment Process**: `fly-deployment-guide.md` 