-- Add donation_destination column to donations table
-- This migration adds a column to track whether donations go to organization or recipients

-- Add donation_destination column (defaults to 'recipients' for backward compatibility)
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS donation_destination TEXT DEFAULT 'recipients';

-- Add comments for documentation
COMMENT ON COLUMN donations.donation_destination IS 'Destination of donation: organization for direct to CFC-GK, recipients for regular recipient matching';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_donations_donation_destination ON donations(donation_destination);

