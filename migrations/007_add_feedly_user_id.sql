-- Add feedly_user_id column to users table
ALTER TABLE users ADD COLUMN feedly_user_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN users.feedly_user_id IS 'The user ID from Feedly, used for constructing stream IDs'; 