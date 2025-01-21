-- Add request_path column to login_history table
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS request_path TEXT;

-- Add comment
COMMENT ON COLUMN login_history.request_path IS 'Request path of the login attempt'; 