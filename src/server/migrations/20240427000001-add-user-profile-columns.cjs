'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add profile columns
    await queryInterface.addColumn('users', 'display_name', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN users.display_name IS 'User''s display name from Google profile';
      COMMENT ON COLUMN users.avatar_url IS 'URL to user''s avatar image from Google profile';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'avatar_url');
    await queryInterface.removeColumn('users', 'display_name');
  }
}; 