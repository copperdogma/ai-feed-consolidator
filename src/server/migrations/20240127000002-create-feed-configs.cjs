'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('feed_configs', {
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
      feedUrl: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'feed_url'
      },
      title: {
        type: Sequelize.STRING(255)
      },
      description: {
        type: Sequelize.TEXT
      },
      siteUrl: {
        type: Sequelize.TEXT,
        field: 'site_url'
      },
      iconUrl: {
        type: Sequelize.TEXT,
        field: 'icon_url'
      },
      lastFetchedAt: {
        type: Sequelize.DATE,
        field: 'last_fetched_at'
      },
      errorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: 'error_count'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
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
      fetchIntervalMinutes: {
        type: Sequelize.INTEGER,
        defaultValue: 60,
        field: 'fetch_interval_minutes'
      }
    });

    // Add unique constraint
    await queryInterface.addConstraint('feed_configs', {
      fields: ['user_id', 'feed_url'],
      type: 'unique',
      name: 'feed_configs_user_id_feed_url_key'
    });

    // Add indexes
    await queryInterface.addIndex('feed_configs', ['user_id'], {
      name: 'idx_feed_configs_user'
    });
    await queryInterface.addIndex('feed_configs', ['user_id'], {
      name: 'idx_feed_configs_active',
      where: {
        is_active: true
      }
    });

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE feed_configs IS 'Stores RSS feed configurations and health metrics';
      COMMENT ON COLUMN feed_configs.feed_url IS 'The URL of the RSS feed';
      COMMENT ON COLUMN feed_configs.fetch_interval_minutes IS 'How often to fetch updates from this feed';
      COMMENT ON COLUMN feed_configs.error_count IS 'Number of consecutive fetch errors';
      COMMENT ON COLUMN feed_configs.is_active IS 'Whether this feed should be actively polled';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('feed_configs');
  }
}; 