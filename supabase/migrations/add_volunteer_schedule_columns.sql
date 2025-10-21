-- Add volunteer schedule columns to users table
-- This migration adds columns for volunteer availability and delivery preferences

-- Add delivery_preferences column (array of text)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS delivery_preferences TEXT[] DEFAULT '{}';

-- Add availability_days column (array of text)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS availability_days TEXT[] DEFAULT '{}';

-- Add availability_times column (array of text)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS availability_times TEXT[] DEFAULT '{}';

-- Add max_delivery_distance column (integer, default 20km)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_delivery_distance INTEGER DEFAULT 20;

-- Add comments for documentation
COMMENT ON COLUMN users.delivery_preferences IS 'Array of preferred delivery types (e.g., Food Items, Clothing, etc.)';
COMMENT ON COLUMN users.availability_days IS 'Array of available days (e.g., Monday, Tuesday, etc.)';
COMMENT ON COLUMN users.availability_times IS 'Array of available time slots (e.g., morning, afternoon, etc.)';
COMMENT ON COLUMN users.max_delivery_distance IS 'Maximum delivery distance in kilometers';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_availability_days ON users USING GIN (availability_days);
CREATE INDEX IF NOT EXISTS idx_users_delivery_preferences ON users USING GIN (delivery_preferences);
