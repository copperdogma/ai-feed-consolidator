-- Create feed_configs table
CREATE TABLE feed_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    site_url TEXT,
    icon_url TEXT,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fetch_interval_minutes INTEGER DEFAULT 60,
    UNIQUE(user_id, feed_url)
);

-- Add indexes
CREATE INDEX idx_feed_configs_user ON feed_configs(user_id);
CREATE INDEX idx_feed_configs_active ON feed_configs(user_id) WHERE is_active = true;

-- Add helpful comments
COMMENT ON TABLE feed_configs IS 'Stores RSS feed configurations and health metrics';
COMMENT ON COLUMN feed_configs.feed_url IS 'The URL of the RSS feed';
COMMENT ON COLUMN feed_configs.fetch_interval_minutes IS 'How often to fetch updates from this feed';
COMMENT ON COLUMN feed_configs.error_count IS 'Number of consecutive fetch errors';
COMMENT ON COLUMN feed_configs.is_active IS 'Whether this feed should be actively polled'; 