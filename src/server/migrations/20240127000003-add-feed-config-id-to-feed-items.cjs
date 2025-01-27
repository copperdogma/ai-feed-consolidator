'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add feed_config_id column
    await queryInterface.addColumn('feed_items', 'feed_config_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'feed_configs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Add index for feed_config_id
    await queryInterface.addIndex('feed_items', ['feed_config_id'], {
      name: 'idx_feed_items_feed_config'
    });

    // Add comment
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN feed_items.feed_config_id IS 'References the feed configuration that this item came from';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('feed_items', 'idx_feed_items_feed_config');
    
    // Remove column
    await queryInterface.removeColumn('feed_items', 'feed_config_id');
  }
};
