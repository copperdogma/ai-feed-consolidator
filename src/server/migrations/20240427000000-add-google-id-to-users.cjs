'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add google_id column
    await queryInterface.addColumn('users', 'google_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });

    // Add index for google_id
    await queryInterface.addIndex('users', ['google_id'], {
      name: 'idx_users_google_id'
    });

    // Add comment
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN users.google_id IS 'Google OAuth2.0 user ID for authentication';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('users', 'idx_users_google_id');
    
    // Remove column
    await queryInterface.removeColumn('users', 'google_id');
  }
}; 