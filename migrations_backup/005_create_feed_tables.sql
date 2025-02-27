-- Create feed_items table
CREATE TABLE feed_items (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_url TEXT,
    image_url TEXT,
    author VARCHAR(255),
    content TEXT,
    summary TEXT,
    url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    engagement_score INTEGER,
    raw_metadata JSONB,
    guid TEXT NOT NULL,
    UNIQUE(source_type, source_id)
);

-- Create indexes for feed_items
CREATE INDEX idx_feed_items_source ON feed_items(source_type, source_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at);
CREATE INDEX idx_feed_items_last_synced_at ON feed_items(last_synced_at);

-- Create processed_items table
CREATE TABLE processed_items (
    id SERIAL PRIMARY KEY,
    feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    processed_summary TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    time_sensitive BOOLEAN DEFAULT false,
    required_background TEXT[],
    consumption_time_minutes INTEGER,
    consumption_type VARCHAR(20),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    UNIQUE(feed_item_id, version)
);

CREATE INDEX idx_processed_items_feed_item ON processed_items(feed_item_id);

-- Create item_states table
CREATE TABLE item_states (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    is_saved BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feed_item_id)
);

CREATE INDEX idx_item_states_user ON item_states(user_id);
CREATE INDEX idx_item_states_feed_item ON item_states(feed_item_id);
CREATE INDEX idx_item_states_user_saved ON item_states(user_id) WHERE is_saved = true;

-- Create sync_history table
CREATE TABLE sync_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    items_synced INTEGER DEFAULT 0,
    success BOOLEAN,
    error_message TEXT,
    sync_type VARCHAR(50)
);

CREATE INDEX idx_sync_history_user ON sync_history(user_id);
CREATE INDEX idx_sync_history_started_at ON sync_history(started_at);

-- Add helpful comments
COMMENT ON TABLE feed_items IS 'Stores content items from various sources (RSS, YouTube, etc.)';
COMMENT ON TABLE processed_items IS 'Stores AI-processed content and metadata to avoid reprocessing';
COMMENT ON TABLE item_states IS 'Tracks per-user item states (read/unread, saved/unsaved)';
COMMENT ON TABLE sync_history IS 'Tracks synchronization attempts with content sources';

-- Add comments on important columns
COMMENT ON COLUMN feed_items.source_id IS 'Platform-specific ID (e.g., RSS GUID, YouTube ID)';
COMMENT ON COLUMN feed_items.source_type IS 'Platform identifier (rss, youtube, x, etc.)';
COMMENT ON COLUMN feed_items.raw_metadata IS 'Source-specific metadata stored as JSONB';
COMMENT ON COLUMN processed_items.version IS 'For tracking processing algorithm versions';
COMMENT ON COLUMN item_states.last_synced_at IS 'Last time we synced this item state with its source';
COMMENT ON COLUMN sync_history.sync_type IS 'Type of sync (full, incremental, states_only)'; 