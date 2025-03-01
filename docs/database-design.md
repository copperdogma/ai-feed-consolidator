# Database Design

## Overview

The AI Feed Consolidator uses PostgreSQL 16 for data storage. The database schema is designed to support feed aggregation, content processing, and user interactions.

## Tables

### users

User accounts and authentication information.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  google_id VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

### feed_configs

Feed configuration and metadata.

```sql
CREATE TABLE feed_configs (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  site_url TEXT,
  icon_url TEXT,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_category VARCHAR(255),
  last_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feed_configs_user_id ON feed_configs(user_id);
CREATE INDEX idx_feed_configs_last_fetched_at ON feed_configs(last_fetched_at);
CREATE INDEX idx_feed_configs_is_active ON feed_configs(is_active);
```

### feed_items

Individual feed items/posts.

```sql
CREATE TABLE feed_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  feed_config_id INTEGER NOT NULL REFERENCES feed_configs(id) ON DELETE CASCADE,
  source_id VARCHAR(255) NOT NULL,
  source_type VARCHAR(255) NOT NULL,
  guid VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  url VARCHAR(255),
  description TEXT,
  content TEXT,
  author VARCHAR(255),
  categories VARCHAR(255)[],
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feed_items_feed_config_id ON feed_items(feed_config_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at);
CREATE INDEX idx_feed_items_guid ON feed_items(guid);
CREATE INDEX idx_feed_items_source ON feed_items(source_type, source_id);
CREATE UNIQUE INDEX feed_items_source_unique ON feed_items(source_type, source_id);
```

### feed_health

Feed health monitoring and error tracking.

```sql
CREATE TABLE feed_health (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  feed_config_id INTEGER NOT NULL REFERENCES feed_configs(id) ON DELETE CASCADE,
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error_category VARCHAR(255),
  last_error_detail TEXT,
  is_permanently_invalid BOOLEAN NOT NULL DEFAULT false,
  requires_special_handling BOOLEAN NOT NULL DEFAULT false,
  special_handler_type VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feed_health_feed_config_id ON feed_health(feed_config_id);
CREATE INDEX idx_feed_health_last_check_at ON feed_health(last_check_at);
CREATE INDEX idx_feed_health_last_error_at ON feed_health(last_error_at);
```

### item_states

User-specific states for feed items.

```sql
CREATE TABLE item_states (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_item_states_user_id ON item_states(user_id);
CREATE INDEX idx_item_states_feed_item_id ON item_states(feed_item_id);
CREATE INDEX idx_item_states_is_read ON item_states(is_read);
CREATE INDEX idx_item_states_is_saved ON item_states(is_saved);
CREATE UNIQUE INDEX idx_item_states_user_item ON item_states(user_id, feed_item_id);
```

### processed_items

AI-processed content and metadata.

```sql
CREATE TABLE processed_items (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  processed_summary TEXT NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  time_sensitive BOOLEAN NOT NULL DEFAULT false,
  required_background VARCHAR(255)[],
  consumption_time_minutes INTEGER,
  consumption_type VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_items_feed_item_id ON processed_items(feed_item_id);
CREATE INDEX idx_processed_items_content_type ON processed_items(content_type);
CREATE INDEX idx_processed_items_time_sensitive ON processed_items(time_sensitive);
CREATE INDEX idx_processed_items_processed_at ON processed_items(processed_at);
```

## Error Categories

The following error categories are used in `feed_configs` and `feed_health`:

- `HTTP_STATUS`: HTTP status code errors (e.g., 404, 500)
- `SSL_ERROR`: SSL/TLS certificate issues
- `DNS_ERROR`: DNS resolution failures
- `TIMEOUT`: Request timeout
- `PARSE_ERROR`: Feed parsing errors
- `INVALID_URL`: Invalid feed URL
- `EMPTY_FEED`: Feed contains no items
- `RATE_LIMITED`: Rate limit exceeded
- `AUTH_ERROR`: Authentication failure
- `NETWORK_ERROR`: General network issues
- `UNKNOWN`: Unclassified errors

## Content Types

The following content types are used in `processed_items`:

- `ARTICLE`: Long-form written content
- `NEWS`: News articles
- `TUTORIAL`: Educational content
- `DOCUMENTATION`: Technical documentation
- `VIDEO`: Video content
- `PODCAST`: Audio content
- `CODE`: Code snippets or repositories
- `DISCUSSION`: Forum threads or discussions
- `ANNOUNCEMENT`: Product or service announcements
- `OTHER`: Unclassified content

## Consumption Types

The following consumption types are used in `processed_items`:

- `QUICK_SCAN`: < 2 minutes
- `BRIEF_READ`: 2-5 minutes
- `DETAILED_READ`: 5-15 minutes
- `DEEP_DIVE`: > 15 minutes
- `WATCH_LATER`: For video/audio content
- `REFERENCE`: For documentation/tutorials

## Migrations

Migrations are managed using a custom migration runner that supports both SQL and JavaScript migrations. The migration files are located in `src/server/migrations/`.

Current migration:
- `20250204000000-initial-schema.cjs`: Initial database schema

## Indexes

The schema includes carefully chosen indexes to optimize common queries:

1. Primary lookup indexes:
   - Primary keys on all tables
   - Foreign key relationships
   - Unique constraints where appropriate

2. Performance indexes:
   - Timestamp fields for range queries
   - Boolean flags for filtering
   - Composite indexes for common query patterns

3. Search indexes:
   - Text fields that are frequently searched
   - Compound indexes for multi-field conditions

## Triggers

The schema includes triggers to:

1. Automatically update `updated_at` timestamps
2. Maintain referential integrity
3. Handle cascading deletes

## Best Practices

1. **Transactions**: Use transactions for multi-table operations
2. **Constraints**: Enforce data integrity through constraints
3. **Timestamps**: Always include `created_at` and `updated_at`
4. **Soft Deletes**: Use `is_active` flags instead of DELETE
5. **Indexing**: Create indexes based on query patterns
6. **Migrations**: One-way migrations with clear purpose
7. **Error Handling**: Proper error categorization
8. **Monitoring**: Track feed health and errors
9. **Performance**: Regular VACUUM and index maintenance
10. **Backups**: Regular backups and point-in-time recovery

## Database Configuration

The AI Feed Consolidator uses PostgreSQL 16 for data storage. This project specifically uses:

- **Port**: 5433 (not the default 5432) to avoid conflicts with other PostgreSQL instances
- **Development Database**: `ai-feed-dev` 
- **Test Database**: `ai-feed-test`

Both databases run on the same PostgreSQL instance (port 5433) but are kept separate to prevent test data from affecting development.

### Connection Strings

```
# Development
DATABASE_URL=postgres://postgres:postgres@localhost:5433/ai-feed-dev

# Test
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/ai-feed-test
```

See `docs/commands-reference.md` for setup instructions and common database commands.
