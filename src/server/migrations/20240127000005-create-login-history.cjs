'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('login_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      loginTime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'login_time'
      },
      ipAddress: {
        type: Sequelize.STRING(45),  // IPv6 addresses can be up to 45 chars
        field: 'ip_address'
      },
      userAgent: {
        type: Sequelize.TEXT,
        field: 'user_agent'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      failureReason: {
        type: Sequelize.TEXT,
        field: 'failure_reason'
      },
      requestPath: {
        type: Sequelize.TEXT,
        field: 'request_path'
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

    // Add indexes
    await queryInterface.addIndex('login_history', ['user_id'], {
      name: 'idx_login_history_user_id'
    });
    await queryInterface.addIndex('login_history', ['login_time'], {
      name: 'idx_login_history_login_time'
    });

    // Add comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE login_history IS 'Tracks user login attempts and history';
      COMMENT ON COLUMN login_history.user_id IS 'User ID for successful logins, NULL for failed attempts';
      COMMENT ON COLUMN login_history.ip_address IS 'IP address of the login attempt';
      COMMENT ON COLUMN login_history.user_agent IS 'Browser/client user agent string';
      COMMENT ON COLUMN login_history.success IS 'Whether the login attempt was successful';
      COMMENT ON COLUMN login_history.failure_reason IS 'Reason for failed login attempts';
      COMMENT ON COLUMN login_history.request_path IS 'Request path of the login attempt';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('login_history');
  }
}; 