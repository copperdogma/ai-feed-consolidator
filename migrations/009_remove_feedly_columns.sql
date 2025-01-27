-- Remove Feedly-specific columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS feedly_access_token,
DROP COLUMN IF EXISTS feedly_refresh_token,
DROP COLUMN IF EXISTS feedly_user_id; 