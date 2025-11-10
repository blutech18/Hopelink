-- Migration: Create matching_parameters table for parameter-driven algorithm configuration
-- This table stores configurable weights and thresholds for the intelligent matching algorithm

-- Create matching_parameters table (without inline CHECK constraints to avoid syntax issues)
CREATE TABLE IF NOT EXISTS matching_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parameter group name (e.g., 'DONOR_RECIPIENT_VOLUNTEER' for unified matching)
  parameter_group VARCHAR(50) NOT NULL UNIQUE,
  
  -- Matching criteria weights (must sum to 1.0)
  geographic_proximity_weight DECIMAL(5, 3) DEFAULT 0.25,
  item_compatibility_weight DECIMAL(5, 3) DEFAULT 0.30,
  urgency_alignment_weight DECIMAL(5, 3) DEFAULT 0.20,
  user_reliability_weight DECIMAL(5, 3) DEFAULT 0.15,
  delivery_compatibility_weight DECIMAL(5, 3) DEFAULT 0.10,
  
  -- Additional weights for volunteer matching
  availability_match_weight DECIMAL(5, 3) DEFAULT 0.25,
  skill_compatibility_weight DECIMAL(5, 3) DEFAULT 0.20,
  urgency_response_weight DECIMAL(5, 3) DEFAULT 0.10,
  
  -- Thresholds for auto-matching
  auto_match_enabled BOOLEAN DEFAULT false,
  auto_match_threshold DECIMAL(5, 3) DEFAULT 0.75,
  auto_claim_threshold DECIMAL(5, 3) DEFAULT 0.85,
  
  -- Distance and quantity parameters
  max_matching_distance_km DECIMAL(10, 2) DEFAULT 50.0,
  min_quantity_match_ratio DECIMAL(5, 3) DEFAULT 0.8,
  
  -- Contextual weight adjustments (for perishable items, critical urgency, etc.)
  perishable_geographic_boost DECIMAL(5, 3) DEFAULT 0.35,
  critical_urgency_boost DECIMAL(5, 3) DEFAULT 0.30,
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add CHECK constraints separately (using DO block to handle IF NOT EXISTS for constraints)
DO $$ 
BEGIN
  -- Add constraints only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_geographic_proximity_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_geographic_proximity_weight CHECK (geographic_proximity_weight >= 0 AND geographic_proximity_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_item_compatibility_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_item_compatibility_weight CHECK (item_compatibility_weight >= 0 AND item_compatibility_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_urgency_alignment_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_urgency_alignment_weight CHECK (urgency_alignment_weight >= 0 AND urgency_alignment_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_user_reliability_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_user_reliability_weight CHECK (user_reliability_weight >= 0 AND user_reliability_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_delivery_compatibility_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_delivery_compatibility_weight CHECK (delivery_compatibility_weight >= 0 AND delivery_compatibility_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_availability_match_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_availability_match_weight CHECK (availability_match_weight >= 0 AND availability_match_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_skill_compatibility_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_skill_compatibility_weight CHECK (skill_compatibility_weight >= 0 AND skill_compatibility_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_urgency_response_weight' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_urgency_response_weight CHECK (urgency_response_weight >= 0 AND urgency_response_weight <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_auto_match_threshold' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_auto_match_threshold CHECK (auto_match_threshold >= 0 AND auto_match_threshold <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_auto_claim_threshold' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_auto_claim_threshold CHECK (auto_claim_threshold >= 0 AND auto_claim_threshold <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_min_quantity_match_ratio' AND conrelid = 'matching_parameters'::regclass) THEN
    ALTER TABLE matching_parameters ADD CONSTRAINT check_min_quantity_match_ratio CHECK (min_quantity_match_ratio >= 0 AND min_quantity_match_ratio <= 1);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matching_parameters_group ON matching_parameters(parameter_group);
CREATE INDEX IF NOT EXISTS idx_matching_parameters_active ON matching_parameters(is_active);

-- Enable RLS
ALTER TABLE matching_parameters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Admins can manage matching parameters" ON matching_parameters;
DROP POLICY IF EXISTS "Users can read active matching parameters" ON matching_parameters;

-- RLS Policies
-- Admins can do everything
CREATE POLICY "Admins can manage matching parameters"
  ON matching_parameters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- All authenticated users can read active parameters
CREATE POLICY "Users can read active matching parameters"
  ON matching_parameters
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default parameter set for unified donor-recipient-volunteer matching
INSERT INTO matching_parameters (
  parameter_group,
  geographic_proximity_weight,
  item_compatibility_weight,
  urgency_alignment_weight,
  user_reliability_weight,
  delivery_compatibility_weight,
  auto_match_enabled,
  auto_match_threshold,
  auto_claim_threshold,
  max_matching_distance_km,
  min_quantity_match_ratio,
  perishable_geographic_boost,
  critical_urgency_boost,
  description
) VALUES 
  (
    'DONOR_RECIPIENT_VOLUNTEER',
    0.30,  -- Geographic proximity (shared: distance between donor, recipient, and volunteer)
    0.25,  -- Item compatibility (shared: donor's item matches recipient's request and volunteer's preferred delivery types)
    0.20,  -- Urgency alignment (priority matching for urgent requests)
    0.15,  -- User reliability (user ratings and history for all parties)
    0.10,  -- Delivery compatibility (shared: delivery method preferences)
    false, -- Auto-match disabled by default (can be enabled by admin)
    0.75,  -- 75% match score threshold for auto-matching
    0.85,  -- 85% match score threshold for auto-claiming
    50.0,  -- Maximum matching distance in kilometers
    0.8,   -- Minimum quantity match ratio
    0.35,  -- Perishable geographic boost
    0.30,  -- Critical urgency boost
    'Unified matching weights for donors, recipients, and volunteers. Geographic Proximity, Item Compatibility, and Delivery Compatibility are shared criteria across all three parties.'
  )
ON CONFLICT (parameter_group) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matching_parameters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_matching_parameters_updated_at ON matching_parameters;

-- Create trigger for updated_at
CREATE TRIGGER update_matching_parameters_updated_at
  BEFORE UPDATE ON matching_parameters
  FOR EACH ROW
  EXECUTE FUNCTION update_matching_parameters_updated_at();

-- Add comments
COMMENT ON TABLE matching_parameters IS 'Stores configurable parameters for the intelligent matching algorithm';
COMMENT ON COLUMN matching_parameters.parameter_group IS 'Parameter group identifier (DONOR_RECIPIENT_VOLUNTEER for unified matching of all three parties)';
COMMENT ON COLUMN matching_parameters.geographic_proximity_weight IS 'Weight for geographic proximity - shared criteria considering distance between donor, recipient, and volunteer';
COMMENT ON COLUMN matching_parameters.item_compatibility_weight IS 'Weight for item compatibility - shared criteria matching donor item to recipient request and volunteer preferred delivery types';
COMMENT ON COLUMN matching_parameters.delivery_compatibility_weight IS 'Weight for delivery compatibility - shared criteria for delivery method preferences across all parties';
COMMENT ON COLUMN matching_parameters.auto_match_enabled IS 'Enable automatic matching when donations/requests are created with volunteers';
COMMENT ON COLUMN matching_parameters.auto_match_threshold IS 'Minimum match score (0-1) to trigger automatic matching';
COMMENT ON COLUMN matching_parameters.auto_claim_threshold IS 'Minimum match score (0-1) to automatically create a claim';
