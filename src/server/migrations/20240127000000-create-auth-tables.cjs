'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255)
      },
      picture_url: {
        type: Sequelize.TEXT,
        field: 'picture_url'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create sessions table
    await queryInterface.createTable('sessions', {
      sid: {
        type: Sequelize.STRING(36),
        primaryKey: true
      },
      expires: {
        type: Sequelize.DATE
      },
      data: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create user_preferences table
    await queryInterface.createTable('user_preferences', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      theme: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'light'
      },
      email_notifications: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      content_language: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en'
      },
      summary_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email'
    });
    await queryInterface.addIndex('sessions', ['expires'], {
      name: 'idx_sessions_expires'
    });
    await queryInterface.addIndex('user_preferences', ['user_id'], {
      name: 'idx_user_preferences_user'
    });

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE users IS 'Stores user account information';
      COMMENT ON TABLE sessions IS 'Stores user session data';
      COMMENT ON TABLE user_preferences IS 'Stores user preferences and settings';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_preferences');
    await queryInterface.dropTable('sessions');
    await queryInterface.dropTable('users');
  }
}; 