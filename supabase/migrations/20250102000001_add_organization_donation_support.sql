-- Add organization donation support
-- This migration adds support for direct donations to CFC-GK organization
-- Migration Date: 2025-01-02

-- Step 1: Add donation_destination column to donations table
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS donation_destination TEXT DEFAULT 'recipients';

-- Add comments for documentation
COMMENT ON COLUMN donations.donation_destination IS 'Destination of donation: organization for direct to CFC-GK, recipients for regular recipient matching';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_donations_donation_destination ON donations(donation_destination);

-- Step 2: Add new delivery mode enum values for organization donations
DO $$
BEGIN
    -- Add 'donor_delivery' if it doesn't exist (donor delivers to CFC-GK)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'donor_delivery' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'delivery_mode')
    ) THEN
        ALTER TYPE delivery_mode ADD VALUE 'donor_delivery';
    END IF;

    -- Add 'organization_pickup' if it doesn't exist (CFC-GK picks up from donor)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'organization_pickup' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'delivery_mode')
    ) THEN
        ALTER TYPE delivery_mode ADD VALUE 'organization_pickup';
    END IF;
END $$;

