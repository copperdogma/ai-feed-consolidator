'use strict';

module.exports = {
  async up(client) {
    // Start transaction
    await client.query('BEGIN');

    try {
      // Drop existing indexes if they exist
      await client.query('DROP INDEX IF EXISTS idx_users_email');
      await client.query('DROP INDEX IF EXISTS idx_users_google_id');
      await client.query('DROP INDEX IF EXISTS idx_feed_configs_user_id');
      await client.query('DROP INDEX IF EXISTS idx_feed_configs_feed_url');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_feed_config_id');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_guid');
      await client.query('DROP INDEX IF EXISTS idx_item_states_feed_item_id');
      await client.query('DROP INDEX IF EXISTS idx_item_states_user_id');
      await client.query('DROP INDEX IF EXISTS idx_login_history_user_id');
      await client.query('DROP INDEX IF EXISTS idx_login_history_login_time');
      await client.query('DROP INDEX IF EXISTS idx_sessions_user_id');
      await client.query('DROP INDEX IF EXISTS idx_sessions_expires_at');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_source_type');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_source_id');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_published_at');
      await client.query('DROP INDEX IF EXISTS idx_feed_items_last_synced_at');
      await client.query('DROP INDEX IF EXISTS idx_processed_items_feed_item');
      await client.query('DROP INDEX IF EXISTS idx_item_states_user');
      await client.query('DROP INDEX IF EXISTS idx_item_states_feed_item');
      await client.query('DROP INDEX IF EXISTS idx_item_states_user_saved');
      await client.query('DROP INDEX IF EXISTS idx_sync_history_user');
      await client.query('DROP INDEX IF EXISTS idx_sync_history_started_at');
      await client.query('DROP INDEX IF EXISTS idx_feed_health_feed_config_id');
      await client.query('DROP INDEX IF EXISTS idx_feed_health_last_check_at');
      await client.query('DROP INDEX IF EXISTS idx_feed_health_is_permanently_invalid');

      // Drop existing tables if they exist
      await client.query('DROP TABLE IF EXISTS sync_history CASCADE');
      await client.query('DROP TABLE IF EXISTS item_states CASCADE');
      await client.query('DROP TABLE IF EXISTS processed_items CASCADE');
      await client.query('DROP TABLE IF EXISTS feed_items CASCADE');
      await client.query('DROP TABLE IF EXISTS feed_health CASCADE');
      await client.query('DROP TABLE IF EXISTS feed_configs CASCADE');
      await client.query('DROP TABLE IF EXISTS login_history CASCADE');
      await client.query('DROP TABLE IF EXISTS user_preferences CASCADE');
      await client.query('DROP TABLE IF EXISTS sessions CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');

      // Create update_updated_at_column function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create advisory lock function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION pg_try_advisory_lock_nowait(lockid integer)
        RETURNS boolean AS $$
        BEGIN
          RETURN pg_try_advisory_lock(lockid);
        END;
        $$ LANGUAGE plpgsql;
      `);

      // Create users table
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255),
          google_id VARCHAR(255) UNIQUE,
          display_name VARCHAR(255),
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create sessions table
      await client.query(`
        CREATE TABLE sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create user_preferences table
      await client.query(`
        CREATE TABLE user_preferences (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          theme VARCHAR(20) NOT NULL DEFAULT 'light',
          email_notifications BOOLEAN NOT NULL DEFAULT true,
          content_language VARCHAR(10) NOT NULL DEFAULT 'en',
          summary_level INTEGER NOT NULL DEFAULT 1 CHECK (summary_level IN (1, 2)),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create login_history table
      await client.query(`
        CREATE TABLE login_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT,
          success BOOLEAN NOT NULL,
          failure_reason TEXT,
          request_path TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create feed_configs table
      await client.query(`
        CREATE TABLE feed_configs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feed_url TEXT NOT NULL,
          feed_type VARCHAR(50) NOT NULL,
          title TEXT,
          description TEXT,
          site_url TEXT,
          icon_url TEXT,
          last_fetched_at TIMESTAMP WITH TIME ZONE,
          error_count INTEGER NOT NULL DEFAULT 0,
          error_category VARCHAR(50),
          last_error TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create feed_health table
      await client.query(`
        CREATE TABLE feed_health (
          id SERIAL PRIMARY KEY,
          feed_config_id INTEGER NOT NULL REFERENCES feed_configs(id) ON DELETE CASCADE,
          last_check_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_error_at TIMESTAMP WITH TIME ZONE,
          last_error_category VARCHAR(50),
          last_error_detail TEXT,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          is_permanently_invalid BOOLEAN NOT NULL DEFAULT false,
          requires_special_handling BOOLEAN NOT NULL DEFAULT false,
          special_handler_type VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create feed_items table
      await client.query(`
        CREATE TABLE feed_items (
          id SERIAL PRIMARY KEY,
          feed_config_id INTEGER NOT NULL REFERENCES feed_configs(id) ON DELETE CASCADE,
          guid TEXT NOT NULL,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          author TEXT,
          content TEXT,
          summary TEXT,
          description TEXT,
          source_type VARCHAR(50) NOT NULL DEFAULT 'RSS',
          source_id TEXT,
          categories TEXT[],
          published_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(feed_config_id, guid)
        );
      `);

      // Create processed_items table
      await client.query(`
        CREATE TABLE processed_items (
          id SERIAL PRIMARY KEY,
          feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
          summary_level INTEGER NOT NULL CHECK (summary_level IN (1, 2)),
          summary TEXT NOT NULL,
          keywords TEXT[],
          sentiment NUMERIC(3,2),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(feed_item_id, summary_level)
        );
      `);

      // Create item_states table
      await client.query(`
        CREATE TABLE item_states (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feed_item_id INTEGER NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
          is_read BOOLEAN NOT NULL DEFAULT false,
          is_saved BOOLEAN NOT NULL DEFAULT false,
          is_hidden BOOLEAN NOT NULL DEFAULT false,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, feed_item_id)
        );
      `);

      // Create sync_history table
      await client.query(`
        CREATE TABLE sync_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          success BOOLEAN NOT NULL DEFAULT false,
          error_message TEXT,
          items_processed INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await client.query('CREATE INDEX idx_users_email ON users(email)');
      await client.query('CREATE INDEX idx_users_google_id ON users(google_id)');
      await client.query('CREATE INDEX idx_feed_configs_user_id ON feed_configs(user_id)');
      await client.query('CREATE INDEX idx_feed_configs_feed_url ON feed_configs(feed_url)');
      await client.query('CREATE INDEX idx_feed_items_feed_config_id ON feed_items(feed_config_id)');
      await client.query('CREATE INDEX idx_feed_items_guid ON feed_items(guid)');
      await client.query('CREATE INDEX idx_item_states_feed_item_id ON item_states(feed_item_id)');
      await client.query('CREATE INDEX idx_item_states_user_id ON item_states(user_id)');
      await client.query('CREATE INDEX idx_login_history_user_id ON login_history(user_id)');
      await client.query('CREATE INDEX idx_login_history_login_time ON login_history(login_time)');
      await client.query('CREATE INDEX idx_sessions_user_id ON sessions(user_id)');
      await client.query('CREATE INDEX idx_sessions_expires_at ON sessions(expires_at)');
      await client.query('CREATE INDEX idx_feed_items_source_type ON feed_items(source_type)');
      await client.query('CREATE INDEX idx_feed_items_source_id ON feed_items(source_id)');
      await client.query('CREATE INDEX idx_feed_items_published_at ON feed_items(published_at)');
      await client.query('CREATE INDEX idx_feed_items_last_synced_at ON feed_items(last_synced_at)');
      await client.query('CREATE INDEX idx_processed_items_feed_item ON processed_items(feed_item_id)');
      await client.query('CREATE INDEX idx_item_states_user ON item_states(user_id)');
      await client.query('CREATE INDEX idx_item_states_feed_item ON item_states(feed_item_id)');
      await client.query('CREATE INDEX idx_item_states_user_saved ON item_states(user_id, is_saved)');
      await client.query('CREATE INDEX idx_sync_history_user ON sync_history(user_id)');
      await client.query('CREATE INDEX idx_sync_history_started_at ON sync_history(started_at)');
      await client.query('CREATE INDEX idx_feed_health_feed_config_id ON feed_health(feed_config_id)');
      await client.query('CREATE INDEX idx_feed_health_last_check_at ON feed_health(last_check_at)');
      await client.query('CREATE INDEX idx_feed_health_is_permanently_invalid ON feed_health(is_permanently_invalid)');

      // Create triggers for updated_at columns
      const tables = [
        'users',
        'sessions',
        'user_preferences',
        'login_history',
        'feed_configs',
        'feed_health',
        'feed_items',
        'processed_items',
        'item_states',
        'sync_history'
      ];

      for (const table of tables) {
        await client.query(`
          CREATE TRIGGER update_${table}_updated_at
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
      }

      // Commit transaction
      await client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  },

  async down(client) {
    // Drop all tables in reverse order
    await client.query('DROP TABLE IF EXISTS sync_history CASCADE');
    await client.query('DROP TABLE IF EXISTS item_states CASCADE');
    await client.query('DROP TABLE IF EXISTS processed_items CASCADE');
    await client.query('DROP TABLE IF EXISTS feed_items CASCADE');
    await client.query('DROP TABLE IF EXISTS feed_health CASCADE');
    await client.query('DROP TABLE IF EXISTS feed_configs CASCADE');
    await client.query('DROP TABLE IF EXISTS login_history CASCADE');
    await client.query('DROP TABLE IF EXISTS user_preferences CASCADE');
    await client.query('DROP TABLE IF EXISTS sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    await client.query('DROP FUNCTION IF EXISTS pg_try_advisory_lock_nowait CASCADE');
  }
}; 