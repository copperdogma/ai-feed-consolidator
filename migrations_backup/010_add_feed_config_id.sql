-- Add feed_config_id column to feed_items table
ALTER TABLE feed_items ADD COLUMN feed_config_id INTEGER REFERENCES feed_configs(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_feed_items_feed_config ON feed_items(feed_config_id);

-- Add helpful comment
COMMENT ON COLUMN feed_items.feed_config_id IS 'References the feed configuration that this item came from'; 