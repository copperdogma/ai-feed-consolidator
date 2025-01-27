'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create feed_items table
    await queryInterface.createTable('feed_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      sourceId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        field: 'source_id'
      },
      sourceType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'source_type',
        defaultValue: 'rss'
      },
      title: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      author: {
        type: Sequelize.STRING(255)
      },
      content: {
        type: Sequelize.TEXT
      },
      summary: {
        type: Sequelize.TEXT
      },
      url: {
        type: Sequelize.TEXT
      },
      publishedAt: {
        type: Sequelize.DATE,
        field: 'published_at'
      },
      crawledAt: {
        type: Sequelize.DATE,
        field: 'crawled_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        field: 'last_synced_at'
      },
      engagementScore: {
        type: Sequelize.INTEGER,
        field: 'engagement_score'
      },
      rawMetadata: {
        type: Sequelize.JSONB,
        field: 'raw_metadata'
      }
    });

    // Create processed_items table
    await queryInterface.createTable('processed_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      feedItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'feed_item_id',
        references: {
          model: 'feed_items',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      processedSummary: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'processed_summary'
      },
      contentType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'content_type'
      },
      timeSensitive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'time_sensitive'
      },
      requiredBackground: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        field: 'required_background'
      },
      consumptionTimeMinutes: {
        type: Sequelize.INTEGER,
        field: 'consumption_time_minutes'
      },
      consumptionType: {
        type: Sequelize.STRING(20),
        field: 'consumption_type'
      },
      processedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'processed_at'
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      }
    });

    // Create item_states table
    await queryInterface.createTable('item_states', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      feedItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'feed_item_id',
        references: {
          model: 'feed_items',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
      },
      isSaved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_saved'
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        field: 'last_synced_at'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create sync_history table
    await queryInterface.createTable('sync_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      startedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'started_at'
      },
      completedAt: {
        type: Sequelize.DATE,
        field: 'completed_at'
      },
      itemsSynced: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'items_synced'
      },
      success: {
        type: Sequelize.BOOLEAN
      },
      errorMessage: {
        type: Sequelize.TEXT,
        field: 'error_message'
      },
      syncType: {
        type: Sequelize.STRING(50),
        field: 'sync_type'
      }
    });

    // Add constraints and indexes
    await queryInterface.addConstraint('feed_items', {
      fields: ['source_type', 'source_id'],
      type: 'unique',
      name: 'feed_items_source_type_source_id_key'
    });

    await queryInterface.addConstraint('processed_items', {
      fields: ['feed_item_id', 'version'],
      type: 'unique',
      name: 'processed_items_feed_item_id_version_key'
    });

    await queryInterface.addConstraint('item_states', {
      fields: ['user_id', 'feed_item_id'],
      type: 'unique',
      name: 'item_states_user_id_feed_item_id_key'
    });

    // Add indexes
    await queryInterface.addIndex('feed_items', ['source_type', 'source_id'], {
      name: 'idx_feed_items_source'
    });
    await queryInterface.addIndex('feed_items', ['published_at'], {
      name: 'idx_feed_items_published_at'
    });
    await queryInterface.addIndex('feed_items', ['last_synced_at'], {
      name: 'idx_feed_items_last_synced_at'
    });
    await queryInterface.addIndex('processed_items', ['feed_item_id'], {
      name: 'idx_processed_items_feed_item'
    });
    await queryInterface.addIndex('item_states', ['user_id'], {
      name: 'idx_item_states_user'
    });
    await queryInterface.addIndex('item_states', ['feed_item_id'], {
      name: 'idx_item_states_feed_item'
    });
    await queryInterface.addIndex('item_states', ['user_id'], {
      name: 'idx_item_states_user_saved',
      where: {
        is_saved: true
      }
    });
    await queryInterface.addIndex('sync_history', ['user_id'], {
      name: 'idx_sync_history_user'
    });
    await queryInterface.addIndex('sync_history', ['started_at'], {
      name: 'idx_sync_history_started_at'
    });

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE feed_items IS 'Stores content items from various sources (Feedly, YouTube, etc.)';
      COMMENT ON TABLE processed_items IS 'Stores AI-processed content and metadata to avoid reprocessing';
      COMMENT ON TABLE item_states IS 'Tracks per-user item states (read/unread, saved/unsaved)';
      COMMENT ON TABLE sync_history IS 'Tracks synchronization attempts with content sources';
      
      COMMENT ON COLUMN feed_items.source_id IS 'Platform-specific ID (e.g., Feedly ID, YouTube ID)';
      COMMENT ON COLUMN feed_items.source_type IS 'Platform identifier (feedly, youtube, x, etc.)';
      COMMENT ON COLUMN feed_items.raw_metadata IS 'Source-specific metadata stored as JSONB';
      COMMENT ON COLUMN processed_items.version IS 'For tracking processing algorithm versions';
      COMMENT ON COLUMN item_states.last_synced_at IS 'Last time we synced this item state with its source';
      COMMENT ON COLUMN sync_history.sync_type IS 'Type of sync (full, incremental, states_only)';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order to handle foreign key constraints
    await queryInterface.dropTable('sync_history');
    await queryInterface.dropTable('item_states');
    await queryInterface.dropTable('processed_items');
    await queryInterface.dropTable('feed_items');
  }
}; 