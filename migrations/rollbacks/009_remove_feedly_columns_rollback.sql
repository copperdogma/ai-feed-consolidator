-- Restore Feedly columns to users table
ALTER TABLE users
ADD COLUMN feedly_access_token TEXT,
ADD COLUMN feedly_refresh_token TEXT,
ADD COLUMN feedly_user_id TEXT;

-- Add comments
COMMENT ON COLUMN users.feedly_access_token IS 'Access token for Feedly API';
COMMENT ON COLUMN users.feedly_refresh_token IS 'Refresh token for Feedly API';
COMMENT ON COLUMN users.feedly_user_id IS 'The user ID from Feedly, used for constructing stream IDs'; 