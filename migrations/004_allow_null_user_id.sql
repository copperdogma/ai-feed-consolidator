-- Allow null values in user_id column
ALTER TABLE login_history ALTER COLUMN user_id DROP NOT NULL; 