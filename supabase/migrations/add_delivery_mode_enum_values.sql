-- Add new delivery mode values for organization donations
-- This migration adds new values to the delivery_mode enum type

-- Add new delivery mode values for organization donations
-- Note: Adding enum values cannot be rolled back easily in PostgreSQL
-- Run this in your Supabase SQL editor or as a migration

-- Check if the enum values already exist before adding them
DO $$
BEGIN
    -- Add 'donor_delivery' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'donor_delivery' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'delivery_mode')
    ) THEN
        ALTER TYPE delivery_mode ADD VALUE 'donor_delivery';
    END IF;

    -- Add 'organization_pickup' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'organization_pickup' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'delivery_mode')
    ) THEN
        ALTER TYPE delivery_mode ADD VALUE 'organization_pickup';
    END IF;
END $$;

