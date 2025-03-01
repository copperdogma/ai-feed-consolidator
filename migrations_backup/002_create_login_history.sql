-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),  -- IPv6 addresses can be up to 45 chars
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    request_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_time ON login_history(login_time);

-- Add comments
COMMENT ON TABLE login_history IS 'Tracks user login attempts and history';
COMMENT ON COLUMN login_history.user_id IS 'User ID for successful logins, NULL for failed attempts';
COMMENT ON COLUMN login_history.ip_address IS 'IP address of the login attempt';
COMMENT ON COLUMN login_history.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN login_history.success IS 'Whether the login attempt was successful';
COMMENT ON COLUMN login_history.failure_reason IS 'Reason for failed login attempts';
COMMENT ON COLUMN login_history.request_path IS 'Request path of the login attempt';

-- Add triggers
CREATE TRIGGER update_login_history_updated_at
  BEFORE UPDATE ON login_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 