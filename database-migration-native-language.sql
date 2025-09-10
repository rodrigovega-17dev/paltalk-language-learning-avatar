-- Migration script to add native_language column to existing user_profiles table
-- Run this script if you have an existing database without the native_language column

-- Add native_language column with default value
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS native_language TEXT DEFAULT 'english';

-- Update existing records to have native_language set to 'english' (most common case)
UPDATE user_profiles 
SET native_language = 'english' 
WHERE native_language IS NULL;

-- Add index for language pair queries (for better performance)
CREATE INDEX IF NOT EXISTS idx_user_profiles_language_pair 
ON user_profiles(target_language, native_language);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.native_language IS 'User''s native language for pronunciation suggestions';

