# Database Design

20240424: Created by Cam Marsollier with Claude 3.5 Sonnet
20240424: Updated by Cam Marsollier with Claude 3.5 Sonnet to make schema more source-agnostic
20240427: Updated by Cam Marsollier with Claude 3.5 Sonnet to document Sequelize migrations

## Overview
This document outlines the database schema for storing feed items, their processed content, and user interactions. The design aims to:
1. Cache feed items to reduce API calls
2. Store processed summaries to avoid reprocessing
3. Track item states (read/unread, saved/unsaved)
4. Support efficient querying and cleanup
5. Allow for future expansion to multiple content sources

## Migration Strategy

The database schema is managed through Sequelize migrations for type safety, reversibility, and better maintainability. Key migration files:

1. `20240127000000-create-auth-tables.cjs`: Authentication tables (users, sessions, user_preferences)
2. `20240127000001-create-feed-tables.cjs`: Feed-related tables (feed_items, processed_items, item_states, sync_history)
3. `20240127000002-add-feed-config-id.cjs`: Feed configuration relationship
4. `20240127000003-create-feed-configs.cjs`: Feed configuration table
5. `20240127000004-remove-feedly-columns.cjs`: Remove Feedly-specific columns
6. `20240127000005-create-login-history.cjs`: Login history tracking

Migration features:
- Type-safe column definitions
- Automatic timestamp handling
- Structured foreign key relationships
- Explicit index definitions
- SQL comments preserved
- Reversible changes with up/down methods

## Schema

### feed_items
Primary table for storing content items from various sources.
```sql
CREATE TABLE feed_items (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) NOT NULL,  -- Platform-specific ID (e.g., Feedly ID, YouTube ID)
    source_type VARCHAR(50) NOT NULL DEFAULT 'feedly',  -- Platform identifier (feedly, youtube, x, etc.)
    title TEXT NOT NULL,
    author VARCHAR(255),
    content TEXT,
    summary TEXT,
    url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE,  -- Last time we checked source for updates
    engagement_score INTEGER,  -- Source-specific engagement metrics
    raw_metadata JSONB,  -- Source-specific metadata
    UNIQUE(source_type, source_id)  -- Ensure uniqueness across sources
);

CREATE INDEX idx_feed_items_source ON feed_items(source_type, source_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at);
CREATE INDEX idx_feed_items_last_synced_at ON feed_items(last_synced_at);
```

### processed_items
Stores AI-processed content and metadata to avoid reprocessing.
```sql
CREATE TABLE processed_items (
    id SERIAL PRIMARY KEY,
    feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    processed_summary TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,  -- technical, news, analysis, tutorial, entertainment
    time_sensitive BOOLEAN DEFAULT false,
    required_background TEXT[],  -- Array of background knowledge topics
    consumption_time_minutes INTEGER,
    consumption_type VARCHAR(20),  -- read, watch, listen
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,  -- For tracking processing algorithm versions
    UNIQUE(feed_item_id, version)
);

CREATE INDEX idx_processed_items_feed_item ON processed_items(feed_item_id);
```

### item_states
Tracks per-user item states (read/unread, saved/unsaved).
```sql
CREATE TABLE item_states (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    is_saved BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE,  -- Last time we synced with Feedly
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feed_item_id)
);

CREATE INDEX idx_item_states_user ON item_states(user_id);
CREATE INDEX idx_item_states_feed_item ON item_states(feed_item_id);
CREATE INDEX idx_item_states_user_saved ON item_states(user_id) WHERE is_saved = true;
```

### sync_history
Tracks synchronization attempts with Feedly for debugging and monitoring.
```sql
CREATE TABLE sync_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    items_synced INTEGER DEFAULT 0,
    success BOOLEAN,
    error_message TEXT,
    sync_type VARCHAR(50)  -- full, incremental, states_only
);

CREATE INDEX idx_sync_history_user ON sync_history(user_id);
CREATE INDEX idx_sync_history_started_at ON sync_history(started_at);
```

## Maintenance

### Cleanup Strategy
1. Keep feed items for 90 days by default
2. Keep saved items indefinitely
3. Run cleanup job daily during off-peak hours

```sql
-- Example cleanup query
DELETE FROM feed_items
WHERE created_at < NOW() - INTERVAL '90 days'
  AND id NOT IN (
    SELECT feed_item_id 
    FROM item_states 
    WHERE is_saved = true
  );
```

### Indexing Strategy
1. Primary lookup by external_id for Feedly synchronization
2. Date-based indexes for cleanup and sorting
3. Compound indexes for common query patterns
4. Partial indexes for saved items

## Sync Process

### Initial Sync
1. Fetch all saved items from Feedly
2. Insert into feed_items if not exists
3. Update item_states for the user
4. Queue items for processing

### Incremental Sync
1. Get items modified since last_synced_at
2. Update feed_items and item_states
3. Process new items
4. Update last_synced_at timestamps

### State Sync
1. Compare local and Feedly states
2. Update item_states table
3. Push changes back to Feedly if local is newer

## Next Steps
1. Implement database migrations
2. Add indexes for common query patterns
3. Set up cleanup job
4. Implement sync process
5. Add monitoring for sync jobs
6. Consider caching layer for frequently accessed items 

## Source Extensibility

### Current Implementation
- Initially focused on Feedly integration
- Schema designed to be source-agnostic
- Basic support for different content types

### Supported Source Types
Current:
- `feedly`: RSS and news aggregation

Planned/Possible:
- `youtube`: Video content
- `x`: Social media posts
- `podcast`: Audio content
- `rss`: Direct RSS feeds
- `mastodon`: Federated social posts

### Source-Specific Considerations

#### Metadata Schemas
Each source type has its own metadata schema stored in `raw_metadata`:

```json
// Feedly example
{
  "feedly": {
    "tags": ["global.saved"],
    "categories": ["tech"],
    "engagement": 23
  }
}

// YouTube example (future)
{
  "youtube": {
    "duration": "PT15M33S",
    "viewCount": 12345,
    "likes": 789
  }
}
```

#### Content Processing
Different source types may require different processing approaches:
- Text content: Summary generation
- Video content: Transcript processing
- Audio content: Speech-to-text before processing
- Social posts: Thread aggregation

### Implementation Strategy
1. Start with Feedly implementation
2. Abstract common patterns
3. Add new sources as needed
4. Keep source-specific code isolated
5. Use feature flags for new sources
