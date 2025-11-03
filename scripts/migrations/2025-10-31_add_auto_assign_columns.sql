-- Add columns to support auto-assign with acceptance flow
-- Safe to run multiple times (IF NOT EXISTS guards)

-- donation_claims tentative volunteer and acceptance expiry
ALTER TABLE IF EXISTS donation_claims
  ADD COLUMN IF NOT EXISTS tentative_volunteer_id uuid NULL,
  ADD COLUMN IF NOT EXISTS acceptance_expires_at timestamptz NULL;

-- Optional index for quick lookups
CREATE INDEX IF NOT EXISTS idx_donation_claims_tentative_volunteer
  ON donation_claims (tentative_volunteer_id);

-- settings flag for auto-assign
-- Ensure settings table exists (singleton row by id=1)
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY,
  platformName text NULL,
  platformDescription text NULL,
  maintenanceMode boolean DEFAULT false,
  registrationEnabled boolean DEFAULT true,
  emailVerificationRequired boolean DEFAULT true,
  supportEmail text NULL,
  maxFileUploadSize integer DEFAULT 10,
  auto_assign_enabled boolean NOT NULL DEFAULT false,
  expiry_retention_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS settings
  ADD COLUMN IF NOT EXISTS expiry_retention_days integer DEFAULT 30;

-- Ensure a singleton row exists (id = 1) for simple key-value settings
INSERT INTO settings (id, auto_assign_enabled, expiry_retention_days)
VALUES (1, false, 30)
ON CONFLICT (id) DO NOTHING;

-- Donation expiry/archival support
ALTER TABLE IF EXISTS donations
  ADD COLUMN IF NOT EXISTS expiration_date timestamptz NULL,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_donations_expiration_date ON donations (expiration_date);
CREATE INDEX IF NOT EXISTS idx_donations_expired_at ON donations (expired_at);
CREATE INDEX IF NOT EXISTS idx_donations_archived_at ON donations (archived_at);


