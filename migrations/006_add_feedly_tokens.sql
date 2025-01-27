-- Add Feedly token columns to users table
ALTER TABLE users
ADD COLUMN feedly_access_token TEXT,
ADD COLUMN feedly_refresh_token TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN users.feedly_access_token IS 'Access token for Feedly API';
COMMENT ON COLUMN users.feedly_refresh_token IS 'Refresh token for Feedly API';

-- Rollback
-- ALTER TABLE users DROP COLUMN feedly_access_token, DROP COLUMN feedly_refresh_token; 