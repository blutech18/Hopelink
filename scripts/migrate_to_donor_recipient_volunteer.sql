-- Migration: Update matching_parameters to use unified DONOR_RECIPIENT_VOLUNTEER parameter group
-- This script migrates from separate DONOR_RECIPIENT and VOLUNTEER_TASK groups to unified matching

-- Step 1: Create DONOR_RECIPIENT_VOLUNTEER parameter group if it doesn't exist
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
  description,
  is_active
) 
SELECT 
  'DONOR_RECIPIENT_VOLUNTEER',
  0.30,  -- Geographic proximity (shared: distance between donor, recipient, and volunteer)
  0.25,  -- Item compatibility (shared: donor's item matches recipient's request and volunteer's preferred delivery types)
  0.20,  -- Urgency alignment (priority matching for urgent requests)
  0.15,  -- User reliability (user ratings and history for all parties)
  0.10,  -- Delivery compatibility (shared: delivery method preferences)
  COALESCE((SELECT auto_match_enabled FROM matching_parameters WHERE parameter_group = 'DONOR_RECIPIENT' LIMIT 1), false),
  0.75,  -- 75% match score threshold for auto-matching
  0.85,  -- 85% match score threshold for auto-claiming
  50.0,  -- Maximum matching distance in kilometers
  0.8,   -- Minimum quantity match ratio
  0.35,  -- Perishable geographic boost
  0.30,  -- Critical urgency boost
  'Unified matching weights for donors, recipients, and volunteers. Geographic Proximity, Item Compatibility, and Delivery Compatibility are shared criteria across all three parties.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM matching_parameters WHERE parameter_group = 'DONOR_RECIPIENT_VOLUNTEER'
);

-- Step 2: If DONOR_RECIPIENT_VOLUNTEER doesn't exist and we have DONOR_RECIPIENT, migrate its settings
DO $$
DECLARE
  donor_recipient_exists BOOLEAN;
  unified_exists BOOLEAN;
BEGIN
  -- Check if DONOR_RECIPIENT exists
  SELECT EXISTS(SELECT 1 FROM matching_parameters WHERE parameter_group = 'DONOR_RECIPIENT') INTO donor_recipient_exists;
  
  -- Check if DONOR_RECIPIENT_VOLUNTEER exists
  SELECT EXISTS(SELECT 1 FROM matching_parameters WHERE parameter_group = 'DONOR_RECIPIENT_VOLUNTEER') INTO unified_exists;
  
  -- If DONOR_RECIPIENT exists but DONOR_RECIPIENT_VOLUNTEER doesn't, create it with migrated values
  IF donor_recipient_exists AND NOT unified_exists THEN
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
      description,
      is_active
    )
    SELECT 
      'DONOR_RECIPIENT_VOLUNTEER',
      -- Use adjusted weights for unified matching (geographic_proximity gets higher weight)
      GREATEST(geographic_proximity_weight, 0.30),
      -- Item compatibility remains important but adjusted for volunteer preferences
      GREATEST(item_compatibility_weight, 0.25),
      urgency_alignment_weight,
      user_reliability_weight,
      delivery_compatibility_weight,
      auto_match_enabled,
      auto_match_threshold,
      auto_claim_threshold,
      COALESCE(max_matching_distance_km, 50.0),
      COALESCE(min_quantity_match_ratio, 0.8),
      COALESCE(perishable_geographic_boost, 0.35),
      COALESCE(critical_urgency_boost, 0.30),
      'Unified matching weights for donors, recipients, and volunteers. Geographic Proximity, Item Compatibility, and Delivery Compatibility are shared criteria across all three parties.',
      true
    FROM matching_parameters
    WHERE parameter_group = 'DONOR_RECIPIENT'
    LIMIT 1;
  END IF;
END $$;

-- Step 3: Normalize weights to ensure they sum to 1.0 for DONOR_RECIPIENT_VOLUNTEER
DO $$
DECLARE
  total_weight DECIMAL;
  current_record RECORD;
BEGIN
  -- Get the DONOR_RECIPIENT_VOLUNTEER record
  SELECT * INTO current_record
  FROM matching_parameters
  WHERE parameter_group = 'DONOR_RECIPIENT_VOLUNTEER'
  LIMIT 1;
  
  IF FOUND THEN
    -- Calculate total weight
    total_weight := 
      COALESCE(current_record.geographic_proximity_weight, 0) +
      COALESCE(current_record.item_compatibility_weight, 0) +
      COALESCE(current_record.urgency_alignment_weight, 0) +
      COALESCE(current_record.user_reliability_weight, 0) +
      COALESCE(current_record.delivery_compatibility_weight, 0);
    
    -- Only normalize if total is not 1.0 (with small tolerance)
    IF ABS(total_weight - 1.0) > 0.01 AND total_weight > 0 THEN
      UPDATE matching_parameters
      SET
        geographic_proximity_weight = COALESCE(current_record.geographic_proximity_weight, 0.30) / total_weight,
        item_compatibility_weight = COALESCE(current_record.item_compatibility_weight, 0.25) / total_weight,
        urgency_alignment_weight = COALESCE(current_record.urgency_alignment_weight, 0.20) / total_weight,
        user_reliability_weight = COALESCE(current_record.user_reliability_weight, 0.15) / total_weight,
        delivery_compatibility_weight = COALESCE(current_record.delivery_compatibility_weight, 0.10) / total_weight,
        updated_at = NOW()
      WHERE parameter_group = 'DONOR_RECIPIENT_VOLUNTEER';
    END IF;
  END IF;
END $$;

-- Step 4: (Optional) Deactivate old parameter groups if needed
-- Uncomment the following lines if you want to deactivate old groups:
-- UPDATE matching_parameters
-- SET is_active = false
-- WHERE parameter_group IN ('DONOR_RECIPIENT', 'VOLUNTEER_TASK')
--   AND parameter_group != 'DONOR_RECIPIENT_VOLUNTEER';

-- Verify the migration
SELECT 
  parameter_group,
  geographic_proximity_weight,
  item_compatibility_weight,
  urgency_alignment_weight,
  user_reliability_weight,
  delivery_compatibility_weight,
  (geographic_proximity_weight + item_compatibility_weight + urgency_alignment_weight + 
   user_reliability_weight + delivery_compatibility_weight) as total_weight,
  is_active,
  description
FROM matching_parameters
WHERE parameter_group = 'DONOR_RECIPIENT_VOLUNTEER';

