-- Remove Feedly token columns from users table
ALTER TABLE users 
DROP COLUMN feedly_access_token,
DROP COLUMN feedly_refresh_token; 