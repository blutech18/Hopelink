

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."account_type" AS ENUM (
    'individual',
    'organization',
    'business'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."claim_status" AS ENUM (
    'claimed',
    'accepted',
    'in_progress',
    'delivered',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."claim_status" OWNER TO "postgres";


CREATE TYPE "public"."delivery_mode" AS ENUM (
    'pickup',
    'volunteer',
    'direct',
    'donor_delivery',
    'organization_pickup'
);


ALTER TYPE "public"."delivery_mode" OWNER TO "postgres";


CREATE TYPE "public"."delivery_status" AS ENUM (
    'pending',
    'assigned',
    'accepted',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."donation_status" AS ENUM (
    'available',
    'matched',
    'claimed',
    'in_transit',
    'delivered',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."donation_status" OWNER TO "postgres";


CREATE TYPE "public"."event_status" AS ENUM (
    'draft',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."event_status" OWNER TO "postgres";


CREATE TYPE "public"."id_verification_status" AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);


ALTER TYPE "public"."id_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'donation_matched',
    'delivery_assigned',
    'delivery_completed',
    'message_received',
    'event_reminder',
    'verification_update',
    'system_alert',
    'donation_request',
    'donation_approved',
    'donation_declined',
    'volunteer_request',
    'volunteer_approved',
    'volunteer_declined'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."notification_type" IS 'Types of notifications: donation_matched, delivery_assigned, delivery_completed, message_received, event_reminder, verification_update, system_alert, volunteer_request, volunteer_approved, volunteer_declined';



CREATE TYPE "public"."request_status" AS ENUM (
    'open',
    'claimed',
    'in_progress',
    'fulfilled',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


CREATE TYPE "public"."urgency_level" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."urgency_level" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'donor',
    'recipient',
    'volunteer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."valid_id_type" AS ENUM (
    'philsys_id',
    'passport',
    'drivers_license',
    'sss_umid',
    'prc_id',
    'voters_id',
    'postal_id',
    'senior_citizen_id',
    'sec_registration',
    'dti_registration',
    'barangay_clearance',
    'fourps_id',
    'barangay_certificate',
    'school_id',
    'dswd_accreditation',
    'representative_id'
);


ALTER TYPE "public"."valid_id_type" OWNER TO "postgres";


CREATE TYPE "public"."vehicle_type" AS ENUM (
    'sedan',
    'suv',
    'truck',
    'van',
    'motorcycle',
    'bicycle',
    'other'
);


ALTER TYPE "public"."vehicle_type" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'pending',
    'verified',
    'rejected',
    'expired'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_volunteer_rating_average"("volunteer_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(rating), 2) INTO avg_rating
    FROM public.volunteer_ratings
    WHERE volunteer_id = volunteer_uuid;
    
    RETURN COALESCE(avg_rating, 0.00);
END;
$$;


ALTER FUNCTION "public"."calculate_volunteer_rating_average"("volunteer_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_profile_completion"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_record RECORD;
    completion_data JSONB;
    missing_fields TEXT[];
    is_complete BOOLEAN;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM public.users WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Initialize missing fields array
    missing_fields := ARRAY[]::TEXT[];
    
    -- Check basic required fields
    IF user_record.name IS NULL OR user_record.name = '' THEN
        missing_fields := array_append(missing_fields, 'name');
    END IF;
    
    IF user_record.phone_number IS NULL OR user_record.phone_number = '' OR user_record.phone_number = '09000000000' THEN
        missing_fields := array_append(missing_fields, 'phone_number');
    END IF;
    
    IF user_record.address IS NULL OR user_record.address = '' OR user_record.address = 'Philippines' THEN
        missing_fields := array_append(missing_fields, 'address');
    END IF;
    
    IF user_record.city IS NULL OR user_record.city = '' THEN
        missing_fields := array_append(missing_fields, 'city');
    END IF;
    
    -- Check ID requirements
    IF user_record.primary_id_type IS NULL THEN
        missing_fields := array_append(missing_fields, 'primary_id_type');
    END IF;
    
    IF user_record.primary_id_number IS NULL OR user_record.primary_id_number = '' THEN
        missing_fields := array_append(missing_fields, 'primary_id_number');
    END IF;
    
    IF user_record.primary_id_image_url IS NULL OR user_record.primary_id_image_url = '' THEN
        missing_fields := array_append(missing_fields, 'primary_id_image');
    END IF;
    
    -- Role-specific validations
    IF user_record.role = 'donor' THEN
        IF user_record.donation_types IS NULL OR array_length(user_record.donation_types, 1) IS NULL THEN
            missing_fields := array_append(missing_fields, 'donation_types');
        END IF;
        
        -- For organizational donors, check for secondary ID (representative ID)
        IF user_record.account_type IN ('organization', 'business') THEN
            IF user_record.secondary_id_type IS NULL THEN
                missing_fields := array_append(missing_fields, 'representative_id_type');
            END IF;
            IF user_record.organization_representative_name IS NULL OR user_record.organization_representative_name = '' THEN
                missing_fields := array_append(missing_fields, 'organization_representative_name');
            END IF;
        END IF;
    END IF;
    
    IF user_record.role = 'recipient' THEN
        IF user_record.household_size IS NULL THEN
            missing_fields := array_append(missing_fields, 'household_size');
        END IF;
        
        IF user_record.assistance_needs IS NULL OR array_length(user_record.assistance_needs, 1) IS NULL THEN
            missing_fields := array_append(missing_fields, 'assistance_needs');
        END IF;
        
        IF user_record.emergency_contact_name IS NULL OR user_record.emergency_contact_name = '' THEN
            missing_fields := array_append(missing_fields, 'emergency_contact_name');
        END IF;
        
        -- For organizational recipients, check for secondary ID
        IF user_record.account_type = 'organization' THEN
            IF user_record.secondary_id_type IS NULL THEN
                missing_fields := array_append(missing_fields, 'representative_id_type');
            END IF;
        END IF;
    END IF;
    
    IF user_record.role = 'volunteer' THEN
        -- Volunteers must have driver's license
        IF user_record.primary_id_type != 'drivers_license' THEN
            missing_fields := array_append(missing_fields, 'drivers_license_required');
        END IF;
        
        IF user_record.availability_days IS NULL OR array_length(user_record.availability_days, 1) IS NULL THEN
            missing_fields := array_append(missing_fields, 'availability_days');
        END IF;
        
        IF user_record.background_check_consent IS FALSE THEN
            missing_fields := array_append(missing_fields, 'background_check_consent');
        END IF;
    END IF;
    
    -- Determine completion status
    is_complete := array_length(missing_fields, 1) IS NULL;
    
    RETURN jsonb_build_object(
        'is_complete', is_complete,
        'missing_fields', missing_fields,
        'completion_percentage', 
        CASE 
            WHEN array_length(missing_fields, 1) IS NULL THEN 100
            ELSE GREATEST(0, 100 - (array_length(missing_fields, 1) * 10))
        END
    );
END;
$$;


ALTER FUNCTION "public"."check_profile_completion"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_backups"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only delete automatic backups, keeping only the 5 most recent
  -- Manual backups are never deleted automatically
  -- Handle case where backup_type column might not exist yet
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'database_backups' 
    AND column_name = 'backup_type'
  ) THEN
    -- Column exists - only delete automatic backups
    DELETE FROM public.database_backups
    WHERE backup_type = 'automatic'
      AND id NOT IN (
        SELECT id
        FROM public.database_backups
        WHERE backup_type = 'automatic'
        ORDER BY backup_date DESC, created_at DESC
        LIMIT 5
      );
  ELSE
    -- Column doesn't exist yet - use old behavior (delete all but 5 most recent)
    DELETE FROM public.database_backups
    WHERE id NOT IN (
      SELECT id
      FROM public.database_backups
      ORDER BY backup_date DESC, created_at DESC
      LIMIT 5
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_backups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_system_logs"("retention_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  -- Calculate cutoff date
  cutoff_date := now() - (retention_days || ' days')::interval;
  
  -- Delete logs older than retention period
  DELETE FROM public.system_logs
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_system_logs"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_weekly_backup"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  backup_exists boolean;
  backup_date timestamptz;
  sql_data text;
  file_size bigint;
  file_name text;
BEGIN
  -- Get the start of the current week (Monday)
  backup_date := date_trunc('week', now())::date;
  
  -- Check if backup already exists for this week
  SELECT EXISTS (
    SELECT 1 FROM database_backups
    WHERE date_trunc('week', backup_date)::date = date_trunc('week', now())::date
  ) INTO backup_exists;

  -- If backup doesn't exist for this week, create one
  -- Note: This is a placeholder. The actual backup creation with SQL export
  -- should be done via the application layer (db.createDatabaseBackup())
  -- as it requires access to all tables and proper SQL generation.
  
  -- This function serves as a trigger point for external cron jobs
  -- that can call the application's backup endpoint
  
  IF NOT backup_exists THEN
    -- Log that backup should be created (actual backup creation happens in app layer)
    RAISE NOTICE 'Weekly backup needed for week starting: %', backup_date;
  END IF;
END;
$$;


ALTER FUNCTION "public"."create_weekly_backup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_volunteer_stats"("volunteer_uuid" "uuid") RETURNS TABLE("total_deliveries" integer, "completed_deliveries" integer, "average_rating" numeric, "total_hours" numeric, "total_distance_km" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id)::INTEGER as total_deliveries,
        COUNT(CASE WHEN d.status = 'delivered' THEN 1 END)::INTEGER as completed_deliveries,
        public.calculate_volunteer_rating_average(volunteer_uuid) as average_rating,
        COALESCE(SUM(vtt.total_hours), 0)::DECIMAL(8,2) as total_hours,
        COALESCE(SUM(d.distance_km), 0)::DECIMAL(10,2) as total_distance_km
    FROM public.deliveries d
    LEFT JOIN public.volunteer_time_tracking vtt ON d.id = vtt.delivery_id
    WHERE d.volunteer_id = volunteer_uuid;
END;
$$;


ALTER FUNCTION "public"."get_volunteer_stats"("volunteer_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_users_to_optimized"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  user_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  FOR user_record IN SELECT * FROM users LOOP
    INSERT INTO users_optimized (
      id, email, name, role, phone_number,
      is_verified, is_active, verification_status,
      address, city, province, latitude, longitude,
      profile_image_url, bio, birthdate, age,
      role_preferences, contact_info, address_details,
      id_verification, organization_info,
      created_at, updated_at, last_login_at,
      event_absence_count, event_banned, event_banned_at, event_banned_by
    ) VALUES (
      user_record.id, user_record.email, user_record.name, user_record.role, user_record.phone_number,
      COALESCE(user_record.is_verified, false), COALESCE(user_record.is_active, true), COALESCE(user_record.verification_status, 'pending'),
      user_record.address, user_record.city, user_record.province, user_record.latitude, user_record.longitude,
      user_record.profile_image_url, user_record.bio, user_record.birthdate, user_record.age,
      -- Consolidate role preferences
      jsonb_build_object(
        'donation_types', COALESCE(user_record.donation_types, '[]'::jsonb),
        'assistance_needs', COALESCE(user_record.assistance_needs, '[]'::jsonb),
        'preferred_delivery_types', COALESCE(user_record.preferred_delivery_types, '[]'::jsonb),
        'volunteer_experience', user_record.volunteer_experience,
        'special_skills', COALESCE(user_record.special_skills, '[]'::jsonb),
        'languages_spoken', COALESCE(user_record.languages_spoken, '[]'::jsonb),
        'delivery_preferences', COALESCE(user_record.delivery_preferences, '[]'::jsonb),
        'communication_preferences', COALESCE(user_record.communication_preferences, '[]'::jsonb)
      ),
      -- Consolidate contact info
      jsonb_build_object(
        'emergency_contact_name', user_record.emergency_contact_name,
        'emergency_contact_phone', user_record.emergency_contact_phone,
        'emergency_contact_relationship', user_record.emergency_contact_relationship,
        'has_insurance', COALESCE(user_record.has_insurance, false),
        'insurance_provider', user_record.insurance_provider,
        'insurance_policy_number', user_record.insurance_policy_number,
        'household_size', user_record.household_size
      ),
      -- Consolidate address details
      jsonb_build_object(
        'house', user_record.address_house,
        'street', user_record.address_street,
        'barangay', user_record.address_barangay,
        'subdivision', user_record.address_subdivision,
        'landmark', user_record.address_landmark,
        'zip_code', user_record.zip_code
      ),
      -- Consolidate ID verification
      jsonb_build_object(
        'primary_id_type', user_record.primary_id_type,
        'primary_id_number', user_record.primary_id_number,
        'primary_id_expiry', user_record.primary_id_expiry,
        'primary_id_image_url', user_record.primary_id_image_url,
        'secondary_id_type', user_record.secondary_id_type,
        'secondary_id_number', user_record.secondary_id_number,
        'secondary_id_expiry', user_record.secondary_id_expiry,
        'secondary_id_image_url', user_record.secondary_id_image_url,
        'status', user_record.id_verification_status,
        'notes', user_record.id_verification_notes,
        'verified_by', user_record.id_verified_by,
        'verified_at', user_record.id_verified_at
      ),
      -- Consolidate organization info
      jsonb_build_object(
        'name', user_record.organization_name,
        'website', user_record.website_link,
        'account_type', user_record.account_type,
        'representative_name', user_record.organization_representative_name,
        'representative_position', user_record.organization_representative_position
      ),
      user_record.created_at, user_record.updated_at, user_record.last_login_at,
      COALESCE(user_record.event_absence_count, 0), COALESCE(user_record.event_banned, false), 
      user_record.event_banned_at, user_record.event_banned_by
    );
    migrated_count := migrated_count + 1;
  END LOOP;
  
  RETURN migrated_count;
END;
$$;


ALTER FUNCTION "public"."migrate_users_to_optimized"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_failed_login"("p_email" "text", "p_ip" "inet" DEFAULT NULL::"inet") RETURNS TABLE("attempt_count" integer, "locked_until" timestamp with time zone, "warning" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_email text := lower(trim(p_email));
  v_now timestamptz := now();
  v_window interval := interval '30 minutes';
  v_lock_duration interval := interval '30 minutes';
  v_attempts record;
  v_locked_until timestamptz;
  v_warning boolean := false;
begin
  if v_email is null or v_email = '' then
    return;
  end if;

  select * into v_attempts
  from public.login_attempts
  where email = v_email
    and (ip = p_ip or p_ip is null)
  order by updated_at desc
  limit 1;

  if v_attempts is null then
    insert into public.login_attempts(email, ip, attempt_count)
    values (v_email, p_ip, 1)
    returning * into v_attempts;
  else
    if v_attempts.last_attempt_at < v_now - v_window then
      v_attempts.attempt_count := 1;
      v_attempts.first_attempt_at := v_now;
    else
      v_attempts.attempt_count := v_attempts.attempt_count + 1;
    end if;

    update public.login_attempts
      set attempt_count = v_attempts.attempt_count,
          last_attempt_at = v_now,
          updated_at = v_now
      where id = v_attempts.id
      returning locked_until into v_locked_until;
  end if;

  if v_attempts.attempt_count >= 5 then
    v_warning := true;
  end if;

  if v_attempts.attempt_count >= 7 then
    v_locked_until := greatest(coalesce(v_locked_until, v_now), v_now + v_lock_duration);
    update public.login_attempts
      set locked_until = v_locked_until,
          updated_at = v_now
      where id = v_attempts.id;
  end if;

  return query
    select v_attempts.attempt_count, v_locked_until, v_warning;
end;
$$;


ALTER FUNCTION "public"."record_failed_login"("p_email" "text", "p_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_failed_logins"("p_email" "text", "p_ip" "inet" DEFAULT NULL::"inet") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.login_attempts
    set attempt_count = 0,
        first_attempt_at = now(),
        locked_until = null,
        updated_at = now()
  where email = lower(trim(p_email))
    and (ip = p_ip or p_ip is null);
end;
$$;


ALTER FUNCTION "public"."reset_failed_logins"("p_email" "text", "p_ip" "inet") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_automatic_maintenance"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  log_retention_days integer;
  expiry_retention_days integer;
  logs_deleted integer;
  donations_expired integer;
  donations_archived integer;
  result jsonb;
BEGIN
  -- Get retention settings from settings table
  SELECT 
    COALESCE(logRetentionDays, 30),
    COALESCE(expiry_retention_days, 30)
  INTO log_retention_days, expiry_retention_days
  FROM settings
  WHERE id = 1;

  -- Initialize result
  result := jsonb_build_object(
    'timestamp', now(),
    'logs_cleaned', 0,
    'donations_expired', 0,
    'donations_archived', 0
  );

  -- Cleanup old system logs (if logging is enabled)
  IF EXISTS (
    SELECT 1 FROM settings 
    WHERE id = 1 AND COALESCE(enableSystemLogs, true) = true
  ) THEN
    BEGIN
      SELECT cleanup_old_system_logs(log_retention_days) INTO logs_deleted;
      result := jsonb_set(result, '{logs_cleaned}', to_jsonb(logs_deleted));
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE WARNING 'Error cleaning up logs: %', SQLERRM;
    END;
  END IF;

  -- Expire donations past expiration_date
  BEGIN
    WITH expired_donations AS (
      UPDATE donations
      SET 
        status = 'expired',
        expired_at = now()
      WHERE 
        expiration_date < now()
        AND status IN ('available', 'matched', 'claimed', 'in_transit', 'delivered')
      RETURNING id
    )
    SELECT COUNT(*) INTO donations_expired FROM expired_donations;
    
    result := jsonb_set(result, '{donations_expired}', to_jsonb(donations_expired));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error expiring donations: %', SQLERRM;
  END;

  -- Archive expired donations after retention period
  BEGIN
    WITH archived_donations AS (
      UPDATE donations
      SET 
        status = 'archived',
        archived_at = now()
      WHERE 
        status = 'expired'
        AND expired_at < (now() - (expiry_retention_days || ' days')::interval)
      RETURNING id
    )
    SELECT COUNT(*) INTO donations_archived FROM archived_donations;
    
    result := jsonb_set(result, '{donations_archived}', to_jsonb(donations_archived));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error archiving donations: %', SQLERRM;
  END;

  -- Log the maintenance run
  INSERT INTO system_logs (level, category, message, details, created_at)
  VALUES (
    'info',
    'system',
    'Automatic maintenance completed',
    result,
    now()
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."run_automatic_maintenance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_old_backups"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM cleanup_old_backups();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_old_backups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_admin_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_direct_deliveries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_direct_deliveries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_matching_parameters_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_matching_parameters_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_volunteer_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_volunteer_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_user_ids"("user_role" "text", "account_type" "text", "primary_id_type" "text", "secondary_id_type" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Donor validation
    IF user_role = 'donor' THEN
        IF account_type = 'individual' THEN
            -- Individual donors need at least one valid ID
            RETURN primary_id_type IN (
                'philsys_id', 'passport', 'drivers_license', 'sss_umid',
                'prc_id', 'voters_id', 'postal_id', 'senior_citizen_id'
            );
        ELSIF account_type IN ('organization', 'business') THEN
            -- Organizational donors need business registration + representative ID
            RETURN primary_id_type IN ('sec_registration', 'dti_registration', 'barangay_clearance')
                AND secondary_id_type IS NOT NULL;
        END IF;
    END IF;
    
    -- Recipient validation
    IF user_role = 'recipient' THEN
        IF account_type = 'individual' THEN
            -- Individual recipients need at least one valid ID
            RETURN primary_id_type IN (
                'fourps_id', 'philsys_id', 'voters_id', 'drivers_license',
                'postal_id', 'barangay_certificate', 'senior_citizen_id'
            );
        ELSIF account_type = 'organization' THEN
            -- Organizational recipients need SEC registration or DSWD accreditation
            RETURN primary_id_type IN ('sec_registration', 'dswd_accreditation')
                AND secondary_id_type IS NOT NULL;
        END IF;
    END IF;
    
    -- Volunteer validation (always requires driver's license for delivery)
    IF user_role = 'volunteer' THEN
        RETURN primary_id_type = 'drivers_license';
    END IF;
    
    -- Admin doesn't have specific ID requirements
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."validate_user_ids"("user_role" "text", "account_type" "text", "primary_id_type" "text", "secondary_id_type" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" NOT NULL,
    "phone_number" "text",
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "address" "text",
    "city" "text",
    "province" "text",
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "profile_image_url" "text",
    "bio" "text",
    "birthdate" "date",
    "age" integer,
    "role_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_info" "jsonb" DEFAULT '{}'::"jsonb",
    "address_details" "jsonb" DEFAULT '{}'::"jsonb",
    "id_verification" "jsonb" DEFAULT '{}'::"jsonb",
    "organization_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "event_absence_count" integer DEFAULT 0,
    "event_banned" boolean DEFAULT false,
    "event_banned_at" timestamp with time zone,
    "event_banned_by" "uuid",
    "account_type" "text" DEFAULT 'individual'::"text",
    "zip_code" "text" DEFAULT '9000'::"text",
    "address_barangay" "text",
    "address_house" "text",
    "address_street" "text",
    "address_subdivision" "text",
    "address_landmark" "text",
    "communication_preferences" "text"[] DEFAULT '{}'::"text"[],
    "preferred_delivery_types" "text"[] DEFAULT '{}'::"text"[],
    "languages_spoken" "text"[] DEFAULT '{}'::"text"[],
    "special_skills" "text"[] DEFAULT '{}'::"text"[],
    "support_needs" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "users_optimized_role_check" CHECK (("role" = ANY (ARRAY['donor'::"text", 'recipient'::"text", 'volunteer'::"text", 'admin'::"text"])))
)
WITH ("fillfactor"='90');


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'HopeLink Users - Optimized production table with JSONB fields for flexible data storage. Supports donors, recipients, volunteers, and administrators.';



COMMENT ON COLUMN "public"."users"."role_preferences" IS 'Role-specific preferences stored as JSONB: {donation_types: string[], assistance_needs: string[], preferred_delivery_types: string[], volunteer_experience: string, special_skills: string[], languages_spoken: string[], delivery_preferences: string[], communication_preferences: string[]}';



COMMENT ON COLUMN "public"."users"."contact_info" IS 'Emergency and insurance information as JSONB: {emergency_contact_name: string, emergency_contact_phone: string, emergency_contact_relationship: string, has_insurance: boolean, insurance_provider: string, insurance_policy_number: string, household_size: number}';



COMMENT ON COLUMN "public"."users"."address_details" IS 'Detailed address components as JSONB: {house: string, street: string, barangay: string, subdivision: string, landmark: string, zip_code: string}';



COMMENT ON COLUMN "public"."users"."id_verification" IS 'Identity verification documents as JSONB: {primary_id_type: string, primary_id_number: string, primary_id_expiry: date, primary_id_image_url: string, secondary_id_type: string, secondary_id_number: string, secondary_id_expiry: date, secondary_id_image_url: string, status: string, notes: string, verified_by: uuid, verified_at: timestamp}';



COMMENT ON COLUMN "public"."users"."organization_info" IS 'Organizational account details as JSONB: {name: string, website: string, account_type: string, representative_name: string, representative_position: string}';



CREATE OR REPLACE VIEW "public"."active_users" AS
 SELECT "id",
    "email",
    "name",
    "role",
    "phone_number",
    "city",
    "province",
    "is_verified",
    "verification_status",
    "created_at",
    (("role_preferences" ->> 'donation_types'::"text"))::"jsonb" AS "donation_types",
    (("role_preferences" ->> 'assistance_needs'::"text"))::"jsonb" AS "assistance_needs",
    (("role_preferences" ->> 'preferred_delivery_types'::"text"))::"jsonb" AS "preferred_delivery_types"
   FROM "public"."users"
  WHERE ("is_active" = true);


ALTER VIEW "public"."active_users" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_users" IS 'Active users with essential profile information and role-specific preferences. Optimized for application queries and user management.';



CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "donor_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "condition" "text",
    "pickup_location" "text",
    "pickup_instructions" "text",
    "expiry_date" "date",
    "status" "public"."donation_status" DEFAULT 'available'::"public"."donation_status",
    "images" "text"[],
    "tags" "text"[],
    "event_id" "uuid",
    "estimated_value" numeric(10,2),
    "is_urgent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_mode" "public"."delivery_mode" DEFAULT 'pickup'::"public"."delivery_mode",
    "donation_destination" "text" DEFAULT 'recipients'::"text",
    "expiration_date" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "claims" "jsonb",
    "requests" "jsonb",
    "confirmations" "jsonb"
)
WITH ("fillfactor"='90');


ALTER TABLE "public"."donations" OWNER TO "postgres";


COMMENT ON TABLE "public"."donations" IS 'Available donations from verified users. Includes detailed item information, pickup logistics, and delivery preferences with full-text search support.';



COMMENT ON COLUMN "public"."donations"."delivery_mode" IS 'How the donation should be delivered: pickup (self pickup), volunteer (delivered by volunteer), direct (delivered by donor)';



COMMENT ON COLUMN "public"."donations"."donation_destination" IS 'Destination of donation: organization for direct to CFC-GK, recipients for regular recipient matching';



CREATE OR REPLACE VIEW "public"."available_donations" AS
 SELECT "d"."id",
    "d"."title",
    "d"."description",
    "d"."category",
    "d"."quantity",
    "d"."condition",
    "d"."pickup_location",
    "d"."delivery_mode",
    "d"."is_urgent",
    "d"."created_at",
    "u"."name" AS "donor_name",
    "u"."city" AS "donor_city",
    "u"."phone_number" AS "donor_phone",
    "u"."is_verified" AS "donor_verified"
   FROM ("public"."donations" "d"
     JOIN "public"."users" "u" ON (("d"."donor_id" = "u"."id")))
  WHERE (("d"."status" = 'available'::"public"."donation_status") AND ("u"."is_active" = true));


ALTER VIEW "public"."available_donations" OWNER TO "postgres";


COMMENT ON VIEW "public"."available_donations" IS 'Currently available donations with donor information. Used for donation browsing, matching algorithms, and inventory management.';



CREATE TABLE IF NOT EXISTS "public"."database_backups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "backup_date" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'completed'::"text",
    "sql_data" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "backup_type" "text" DEFAULT 'automatic'::"text",
    CONSTRAINT "database_backups_backup_type_check" CHECK (("backup_type" = ANY (ARRAY['automatic'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."database_backups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."database_backups"."backup_type" IS 'Type of backup: automatic (weekly, limited to 5) or manual (unlimited)';



CREATE OR REPLACE VIEW "public"."database_info" AS
 SELECT 'HopeLink Production Database'::"text" AS "database_name",
    CURRENT_DATE AS "last_optimized",
    '1.0.1'::"text" AS "schema_version",
    'Production Ready - Cleaned'::"text" AS "status",
    ( SELECT "count"(*) AS "count"
           FROM "information_schema"."tables"
          WHERE (("tables"."table_schema")::"name" = 'public'::"name")) AS "total_tables",
    ( SELECT "count"(*) AS "count"
           FROM "information_schema"."views"
          WHERE (("views"."table_schema")::"name" = 'public'::"name")) AS "total_views",
    ( SELECT "count"(*) AS "count"
           FROM "pg_indexes"
          WHERE ("pg_indexes"."schemaname" = 'public'::"name")) AS "total_indexes",
    ( SELECT "count"(*) AS "count"
           FROM "public"."users"
          WHERE ("users"."is_active" = true)) AS "active_users",
    ( SELECT "count"(*) AS "count"
           FROM "public"."donations"
          WHERE ("donations"."status" = 'available'::"public"."donation_status")) AS "available_donations",
    'Backup tables removed - database optimized and cleaned'::"text" AS "notes";


ALTER VIEW "public"."database_info" OWNER TO "postgres";


COMMENT ON VIEW "public"."database_info" IS 'Database metadata and statistics for maintenance, monitoring, and administrative reporting.';



CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "volunteer_id" "uuid",
    "pickup_address" "text",
    "delivery_address" "text",
    "pickup_city" "text",
    "delivery_city" "text",
    "schedule_info" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "tracking_info" "jsonb" DEFAULT '{}'::"jsonb",
    "confirmation_info" "jsonb" DEFAULT '{}'::"jsonb",
    "distance_km" numeric(8,2),
    "delivery_fee" numeric(10,2) DEFAULT 0,
    "duration_info" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "in_transit_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "delivery_mode" character varying(50) DEFAULT 'assigned'::character varying,
    "notes" character varying(500)
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."deliveries" IS 'Professional delivery logistics management. Tracks volunteer assignments, delivery status, and completion metrics.';



COMMENT ON COLUMN "public"."deliveries"."schedule_info" IS 'JSONB: {pickup_window_start: "", pickup_window_end: "", delivery_window_start: "", delivery_window_end: ""}';



COMMENT ON COLUMN "public"."deliveries"."tracking_info" IS 'JSONB: {pickup_confirmation_code: "", delivery_confirmation_code: "", tracking_notes: "", actual_pickup_time: "", actual_delivery_time: ""}';



COMMENT ON COLUMN "public"."deliveries"."confirmation_info" IS 'JSONB: {pickup_photo_url: "", delivery_photo_url: "", volunteer_notes: ""}';



COMMENT ON COLUMN "public"."deliveries"."duration_info" IS 'JSONB: {estimated_duration_hours: 0, actual_duration_hours: 0}';



COMMENT ON COLUMN "public"."deliveries"."accepted_at" IS 'Timestamp when the volunteer accepted the delivery task';



COMMENT ON COLUMN "public"."deliveries"."picked_up_at" IS 'Timestamp when the delivery was picked up from the donor';



COMMENT ON COLUMN "public"."deliveries"."in_transit_at" IS 'Timestamp when the delivery is in transit to the recipient';



COMMENT ON COLUMN "public"."deliveries"."delivered_at" IS 'Timestamp when the delivery was completed and delivered to the recipient';



CREATE TABLE IF NOT EXISTS "public"."donation_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "quantity_needed" integer DEFAULT 1 NOT NULL,
    "urgency" "public"."urgency_level" DEFAULT 'medium'::"public"."urgency_level",
    "location" "text",
    "needed_by" "date",
    "status" "public"."request_status" DEFAULT 'open'::"public"."request_status",
    "tags" "text"[],
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_mode" "public"."delivery_mode" DEFAULT 'pickup'::"public"."delivery_mode",
    "sample_image" "text"
)
WITH ("fillfactor"='90');


ALTER TABLE "public"."donation_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."donation_requests" IS 'User requests for specific items. Automatically matched with available donations using intelligent algorithms with priority-based processing.';



COMMENT ON COLUMN "public"."donation_requests"."delivery_mode" IS 'How the recipient prefers to receive donations: pickup (self pickup), volunteer (delivered by volunteer), direct (delivered by donor)';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "location" "text",
    "event_config" "jsonb" DEFAULT '{}'::"jsonb",
    "target_goal" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "max_participants" integer,
    "current_participants" integer DEFAULT 0,
    "status" "text" DEFAULT 'upcoming'::"text",
    "image_url" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "what_to_bring" "jsonb" DEFAULT '[]'::"jsonb",
    "contact_info" "jsonb" DEFAULT '{"email": "N/A", "phone": "N/A", "coordinator": "Event Coordinator"}'::"jsonb",
    "items" "jsonb",
    "participants" "jsonb"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Community events and volunteer activities. Supports automated registration, participation tracking, and capacity management.';



COMMENT ON COLUMN "public"."events"."event_config" IS 'JSONB: {schedule: [], requirements: [], what_to_bring: [], contact_info: {}}';



COMMENT ON COLUMN "public"."events"."schedule" IS 'Array of schedule items with time and activity fields';



COMMENT ON COLUMN "public"."events"."requirements" IS 'Array of requirement strings for the event';



COMMENT ON COLUMN "public"."events"."what_to_bring" IS 'Array of items participants should bring';



COMMENT ON COLUMN "public"."events"."contact_info" IS 'Contact information object with coordinator, phone, and email fields';



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "transaction_id" "uuid",
    "transaction_type" character varying(50),
    "rater_id" "uuid",
    "rated_user_id" "uuid",
    "rating" integer,
    "feedback_text" "text",
    "feedback_type" character varying(50),
    "category" character varying(50),
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "ip" "inet",
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "first_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


ALTER TABLE "public"."login_attempts" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."login_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."matching_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parameter_group" character varying(50) NOT NULL,
    "geographic_proximity_weight" numeric(5,3) DEFAULT 0.25,
    "item_compatibility_weight" numeric(5,3) DEFAULT 0.30,
    "urgency_alignment_weight" numeric(5,3) DEFAULT 0.20,
    "user_reliability_weight" numeric(5,3) DEFAULT 0.15,
    "delivery_compatibility_weight" numeric(5,3) DEFAULT 0.10,
    "availability_match_weight" numeric(5,3) DEFAULT 0.25,
    "skill_compatibility_weight" numeric(5,3) DEFAULT 0.20,
    "urgency_response_weight" numeric(5,3) DEFAULT 0.10,
    "auto_match_enabled" boolean DEFAULT false,
    "auto_match_threshold" numeric(5,3) DEFAULT 0.75,
    "auto_claim_threshold" numeric(5,3) DEFAULT 0.85,
    "max_matching_distance_km" numeric(10,2) DEFAULT 50.0,
    "min_quantity_match_ratio" numeric(5,3) DEFAULT 0.8,
    "perishable_geographic_boost" numeric(5,3) DEFAULT 0.35,
    "critical_urgency_boost" numeric(5,3) DEFAULT 0.30,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "check_auto_claim_threshold" CHECK ((("auto_claim_threshold" >= (0)::numeric) AND ("auto_claim_threshold" <= (1)::numeric))),
    CONSTRAINT "check_auto_match_threshold" CHECK ((("auto_match_threshold" >= (0)::numeric) AND ("auto_match_threshold" <= (1)::numeric))),
    CONSTRAINT "check_availability_match_weight" CHECK ((("availability_match_weight" >= (0)::numeric) AND ("availability_match_weight" <= (1)::numeric))),
    CONSTRAINT "check_delivery_compatibility_weight" CHECK ((("delivery_compatibility_weight" >= (0)::numeric) AND ("delivery_compatibility_weight" <= (1)::numeric))),
    CONSTRAINT "check_geographic_proximity_weight" CHECK ((("geographic_proximity_weight" >= (0)::numeric) AND ("geographic_proximity_weight" <= (1)::numeric))),
    CONSTRAINT "check_item_compatibility_weight" CHECK ((("item_compatibility_weight" >= (0)::numeric) AND ("item_compatibility_weight" <= (1)::numeric))),
    CONSTRAINT "check_min_quantity_match_ratio" CHECK ((("min_quantity_match_ratio" >= (0)::numeric) AND ("min_quantity_match_ratio" <= (1)::numeric))),
    CONSTRAINT "check_skill_compatibility_weight" CHECK ((("skill_compatibility_weight" >= (0)::numeric) AND ("skill_compatibility_weight" <= (1)::numeric))),
    CONSTRAINT "check_urgency_alignment_weight" CHECK ((("urgency_alignment_weight" >= (0)::numeric) AND ("urgency_alignment_weight" <= (1)::numeric))),
    CONSTRAINT "check_urgency_response_weight" CHECK ((("urgency_response_weight" >= (0)::numeric) AND ("urgency_response_weight" <= (1)::numeric))),
    CONSTRAINT "check_user_reliability_weight" CHECK ((("user_reliability_weight" >= (0)::numeric) AND ("user_reliability_weight" <= (1)::numeric)))
);


ALTER TABLE "public"."matching_parameters" OWNER TO "postgres";


COMMENT ON TABLE "public"."matching_parameters" IS 'Stores configurable parameters for the intelligent matching algorithm';



COMMENT ON COLUMN "public"."matching_parameters"."parameter_group" IS 'Parameter group identifier (DONOR_RECIPIENT_VOLUNTEER for unified matching of all three parties)';



COMMENT ON COLUMN "public"."matching_parameters"."geographic_proximity_weight" IS 'Weight for geographic proximity - shared criteria considering distance between donor, recipient, and volunteer';



COMMENT ON COLUMN "public"."matching_parameters"."item_compatibility_weight" IS 'Weight for item compatibility - shared criteria matching donor item to recipient request and volunteer preferred delivery types';



COMMENT ON COLUMN "public"."matching_parameters"."delivery_compatibility_weight" IS 'Weight for delivery compatibility - shared criteria for delivery method preferences across all parties';



COMMENT ON COLUMN "public"."matching_parameters"."auto_match_enabled" IS 'Enable automatic matching when donations/requests are created with volunteers';



COMMENT ON COLUMN "public"."matching_parameters"."auto_match_threshold" IS 'Minimum match score (0-1) to trigger automatic matching';



COMMENT ON COLUMN "public"."matching_parameters"."auto_claim_threshold" IS 'Minimum match score (0-1) to automatically create a claim';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Real-time notification system supporting multiple notification types and delivery channels for user engagement.';



CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "operation_type" "text" NOT NULL,
    "execution_time_ms" integer,
    "row_count" integer,
    "query_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."performance_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."performance_metrics" IS 'System performance monitoring and analytics. Tracks database performance, query optimization, and overall system health.';



CREATE OR REPLACE VIEW "public"."performance_summary" AS
 SELECT "table_name",
    "operation_type",
    "count"(*) AS "query_count",
    "avg"("execution_time_ms") AS "avg_execution_time",
    "max"("execution_time_ms") AS "max_execution_time",
    "avg"("row_count") AS "avg_row_count"
   FROM "public"."performance_metrics"
  WHERE ("created_at" >= ("now"() - '24:00:00'::interval))
  GROUP BY "table_name", "operation_type"
  ORDER BY ("avg"("execution_time_ms")) DESC;


ALTER VIEW "public"."performance_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."platform_metrics" AS
 SELECT 'Total Active Users'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    'users'::"text" AS "category"
   FROM "public"."users"
  WHERE ("users"."is_active" = true)
UNION ALL
 SELECT 'Available Donations'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    'donations'::"text" AS "category"
   FROM "public"."donations"
  WHERE ("donations"."status" = 'available'::"public"."donation_status")
UNION ALL
 SELECT 'Active Requests'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    'requests'::"text" AS "category"
   FROM "public"."donation_requests"
  WHERE ("donation_requests"."status" <> ALL (ARRAY['cancelled'::"public"."request_status", 'expired'::"public"."request_status"]))
UNION ALL
 SELECT 'Verified Users'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    'verification'::"text" AS "category"
   FROM "public"."users"
  WHERE (("users"."is_verified" = true) AND ("users"."is_active" = true))
UNION ALL
 SELECT 'Monthly Signups'::"text" AS "metric",
    ("count"(*))::"text" AS "value",
    'growth'::"text" AS "category"
   FROM "public"."users"
  WHERE ("users"."created_at" > ("now"() - '30 days'::interval));


ALTER VIEW "public"."platform_metrics" OWNER TO "postgres";


COMMENT ON VIEW "public"."platform_metrics" IS 'Key platform performance indicators for dashboard reporting and executive summaries.';



CREATE OR REPLACE VIEW "public"."system_health" AS
 SELECT 'users'::"text" AS "table_name",
    "count"(*) AS "total_records",
    "count"(*) FILTER (WHERE ("users"."is_active" = true)) AS "active_records",
    "count"(*) FILTER (WHERE ("users"."created_at" > ("now"() - '30 days'::interval))) AS "recent_records",
    "count"(*) FILTER (WHERE ("users"."is_verified" = true)) AS "verified_records"
   FROM "public"."users"
UNION ALL
 SELECT 'donations'::"text" AS "table_name",
    "count"(*) AS "total_records",
    "count"(*) FILTER (WHERE ("donations"."status" = 'available'::"public"."donation_status")) AS "active_records",
    "count"(*) FILTER (WHERE ("donations"."created_at" > ("now"() - '30 days'::interval))) AS "recent_records",
    "count"(*) FILTER (WHERE ("donations"."status" = 'delivered'::"public"."donation_status")) AS "verified_records"
   FROM "public"."donations"
UNION ALL
 SELECT 'donation_requests'::"text" AS "table_name",
    "count"(*) AS "total_records",
    "count"(*) FILTER (WHERE ("donation_requests"."status" <> ALL (ARRAY['cancelled'::"public"."request_status", 'expired'::"public"."request_status"]))) AS "active_records",
    "count"(*) FILTER (WHERE ("donation_requests"."created_at" > ("now"() - '30 days'::interval))) AS "recent_records",
    "count"(*) FILTER (WHERE ("donation_requests"."status" = 'fulfilled'::"public"."request_status")) AS "verified_records"
   FROM "public"."donation_requests";


ALTER VIEW "public"."system_health" OWNER TO "postgres";


COMMENT ON VIEW "public"."system_health" IS 'Database health metrics and record counts for system monitoring, maintenance planning, and performance analysis.';



CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level" "text" DEFAULT 'info'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "details" "jsonb",
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audit_data" "jsonb"
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "setting_type" character varying(50),
    "category" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_analytics" AS
 SELECT "role",
    "count"(*) AS "total_users",
    "count"(*) FILTER (WHERE ("is_verified" = true)) AS "verified_users",
    "count"(*) FILTER (WHERE ("last_login_at" > ("now"() - '30 days'::interval))) AS "active_monthly",
    "count"(*) FILTER (WHERE ("created_at" > ("now"() - '30 days'::interval))) AS "new_this_month",
    "round"(((("count"(*) FILTER (WHERE ("is_verified" = true)))::numeric / (NULLIF("count"(*), 0))::numeric) * (100)::numeric), 2) AS "verification_rate_percent"
   FROM "public"."users"
  WHERE ("is_active" = true)
  GROUP BY "role"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."user_analytics" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_analytics" IS 'User engagement and verification analytics by role for platform growth analysis and user management insights.';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "donor" "jsonb",
    "recipient" "jsonb",
    "volunteer" "jsonb",
    "preferences" "jsonb",
    "id_documents" "jsonb",
    "reports" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."volunteer_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "volunteer_id" "uuid" NOT NULL,
    "claim_id" "uuid",
    "request_id" "uuid",
    "task_type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "volunteer_requests_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('rejected'::character varying)::"text", ('cancelled'::character varying)::"text"]))),
    CONSTRAINT "volunteer_requests_task_check" CHECK (((("claim_id" IS NOT NULL) AND ("request_id" IS NULL)) OR (("claim_id" IS NULL) AND ("request_id" IS NOT NULL)))),
    CONSTRAINT "volunteer_requests_task_type_check" CHECK ((("task_type")::"text" = ANY (ARRAY[('approved_donation'::character varying)::"text", ('request'::character varying)::"text"])))
);


ALTER TABLE "public"."volunteer_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."volunteer_time_tracking" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "volunteer_id" "uuid" NOT NULL,
    "delivery_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "break_duration_minutes" integer DEFAULT 0,
    "total_hours" numeric(4,2),
    "activity_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."volunteer_time_tracking" OWNER TO "postgres";


ALTER TABLE ONLY "public"."database_backups"
    ADD CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_optimized_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donation_requests"
    ADD CONSTRAINT "donation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_optimized_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matching_parameters"
    ADD CONSTRAINT "matching_parameters_parameter_group_key" UNIQUE ("parameter_group");



ALTER TABLE ONLY "public"."matching_parameters"
    ADD CONSTRAINT "matching_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_optimized_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_optimized_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."volunteer_requests"
    ADD CONSTRAINT "volunteer_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."volunteer_requests"
    ADD CONSTRAINT "volunteer_requests_volunteer_id_claim_id_key" UNIQUE ("volunteer_id", "claim_id");



ALTER TABLE ONLY "public"."volunteer_requests"
    ADD CONSTRAINT "volunteer_requests_volunteer_id_request_id_key" UNIQUE ("volunteer_id", "request_id");



ALTER TABLE ONLY "public"."volunteer_time_tracking"
    ADD CONSTRAINT "volunteer_time_tracking_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_database_backups_created_at" ON "public"."database_backups" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_database_backups_date" ON "public"."database_backups" USING "btree" ("backup_date" DESC);



CREATE INDEX "idx_database_backups_type" ON "public"."database_backups" USING "btree" ("backup_type");



CREATE INDEX "idx_database_backups_type_date" ON "public"."database_backups" USING "btree" ("backup_type", "backup_date" DESC);



CREATE INDEX "idx_database_backups_type_date_created" ON "public"."database_backups" USING "btree" ("backup_type", "backup_date" DESC, "created_at" DESC);



CREATE INDEX "idx_deliveries_claim" ON "public"."deliveries" USING "btree" ("claim_id");



CREATE INDEX "idx_deliveries_mode" ON "public"."deliveries" USING "btree" ("delivery_mode");



CREATE INDEX "idx_deliveries_optimized_claim" ON "public"."deliveries" USING "btree" ("claim_id");



CREATE INDEX "idx_deliveries_optimized_status" ON "public"."deliveries" USING "btree" ("status");



CREATE INDEX "idx_deliveries_optimized_volunteer" ON "public"."deliveries" USING "btree" ("volunteer_id");



CREATE INDEX "idx_deliveries_volunteer" ON "public"."deliveries" USING "btree" ("volunteer_id");



CREATE INDEX "idx_donation_requests_category" ON "public"."donation_requests" USING "btree" ("category");



CREATE INDEX "idx_donation_requests_created_at" ON "public"."donation_requests" USING "btree" ("created_at");



CREATE INDEX "idx_donation_requests_delivery_mode" ON "public"."donation_requests" USING "btree" ("delivery_mode");



CREATE INDEX "idx_donation_requests_requester_id" ON "public"."donation_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_donation_requests_status" ON "public"."donation_requests" USING "btree" ("status");



CREATE INDEX "idx_donation_requests_urgency" ON "public"."donation_requests" USING "btree" ("urgency");



CREATE INDEX "idx_donations_archived_at" ON "public"."donations" USING "btree" ("archived_at");



CREATE INDEX "idx_donations_category" ON "public"."donations" USING "btree" ("category");



CREATE INDEX "idx_donations_created_at" ON "public"."donations" USING "btree" ("created_at");



CREATE INDEX "idx_donations_delivery_mode" ON "public"."donations" USING "btree" ("delivery_mode");



CREATE INDEX "idx_donations_donation_destination" ON "public"."donations" USING "btree" ("donation_destination");



CREATE INDEX "idx_donations_donor_id" ON "public"."donations" USING "btree" ("donor_id");



CREATE INDEX "idx_donations_event_id" ON "public"."donations" USING "btree" ("event_id");



CREATE INDEX "idx_donations_expiration_date" ON "public"."donations" USING "btree" ("expiration_date");



CREATE INDEX "idx_donations_expired_at" ON "public"."donations" USING "btree" ("expired_at");



CREATE INDEX "idx_donations_is_urgent" ON "public"."donations" USING "btree" ("is_urgent");



CREATE INDEX "idx_donations_search" ON "public"."donations" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_donations_status" ON "public"."donations" USING "btree" ("status");



CREATE INDEX "idx_donations_status_category" ON "public"."donations" USING "btree" ("status", "category") WHERE ("status" = 'available'::"public"."donation_status");



CREATE INDEX "idx_donations_urgent_available" ON "public"."donations" USING "btree" ("is_urgent", "status", "created_at") WHERE ("status" = 'available'::"public"."donation_status");



CREATE INDEX "idx_events_creator" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_optimized_creator" ON "public"."events" USING "btree" ("created_by");



CREATE INDEX "idx_events_optimized_dates" ON "public"."events" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_events_optimized_status" ON "public"."events" USING "btree" ("status");



CREATE INDEX "idx_feedback_transaction" ON "public"."feedback" USING "btree" ("transaction_type", "transaction_id");



CREATE INDEX "idx_feedback_user" ON "public"."feedback" USING "btree" ("user_id");



CREATE INDEX "idx_matching_parameters_active" ON "public"."matching_parameters" USING "btree" ("is_active");



CREATE INDEX "idx_matching_parameters_group" ON "public"."matching_parameters" USING "btree" ("parameter_group");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_read_at" ON "public"."notifications" USING "btree" ("read_at");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_performance_metrics_operation" ON "public"."performance_metrics" USING "btree" ("operation_type");



CREATE INDEX "idx_performance_metrics_table" ON "public"."performance_metrics" USING "btree" ("table_name");



CREATE INDEX "idx_performance_metrics_time" ON "public"."performance_metrics" USING "btree" ("created_at");



CREATE INDEX "idx_requests_search" ON "public"."donation_requests" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("title" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_system_logs_audit_data" ON "public"."system_logs" USING "gin" ("audit_data");



CREATE INDEX "idx_system_logs_category" ON "public"."system_logs" USING "btree" ("category");



CREATE INDEX "idx_system_logs_created_at" ON "public"."system_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_logs_level" ON "public"."system_logs" USING "btree" ("level");



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id");



CREATE INDEX "idx_system_settings_category" ON "public"."system_settings" USING "btree" ("category");



CREATE INDEX "idx_users_active_verified" ON "public"."users" USING "btree" ("is_active", "is_verified");



CREATE INDEX "idx_users_coordinates" ON "public"."users" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_users_location" ON "public"."users" USING "btree" ("city", "province");



CREATE INDEX "idx_users_location_active" ON "public"."users" USING "btree" ("city", "province", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_users_optimized_active_verified" ON "public"."users" USING "btree" ("is_active", "is_verified");



CREATE INDEX "idx_users_optimized_coordinates" ON "public"."users" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_users_optimized_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_optimized_location" ON "public"."users" USING "btree" ("city", "province");



CREATE INDEX "idx_users_optimized_role" ON "public"."users" USING "btree" ("role");



CREATE INDEX "idx_users_optimized_role_preferences" ON "public"."users" USING "gin" ("role_preferences");



CREATE INDEX "idx_users_role_active_verified" ON "public"."users" USING "btree" ("role", "is_active", "is_verified") WHERE ("is_active" = true);



CREATE INDEX "idx_users_role_preferences" ON "public"."users" USING "gin" ("role_preferences");



CREATE INDEX "idx_volunteer_requests_claim_id" ON "public"."volunteer_requests" USING "btree" ("claim_id");



CREATE INDEX "idx_volunteer_requests_created_at" ON "public"."volunteer_requests" USING "btree" ("created_at");



CREATE INDEX "idx_volunteer_requests_request_id" ON "public"."volunteer_requests" USING "btree" ("request_id");



CREATE INDEX "idx_volunteer_requests_status" ON "public"."volunteer_requests" USING "btree" ("status");



CREATE INDEX "idx_volunteer_requests_volunteer_id" ON "public"."volunteer_requests" USING "btree" ("volunteer_id");



CREATE INDEX "login_attempts_email_idx" ON "public"."login_attempts" USING "btree" ("email");



CREATE INDEX "login_attempts_ip_idx" ON "public"."login_attempts" USING "btree" ("ip");



CREATE OR REPLACE TRIGGER "cleanup_backups_after_insert" AFTER INSERT ON "public"."database_backups" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_cleanup_old_backups"();



CREATE OR REPLACE TRIGGER "trigger_donations_updated_at" BEFORE UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_requests_updated_at" BEFORE UPDATE ON "public"."donation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_volunteer_requests_updated_at" BEFORE UPDATE ON "public"."volunteer_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_volunteer_requests_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_deliveries_optimized_updated_at" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_donation_requests_updated_at" BEFORE UPDATE ON "public"."donation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_donations_updated_at" BEFORE UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_events_optimized_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_matching_parameters_updated_at" BEFORE UPDATE ON "public"."matching_parameters" FOR EACH ROW EXECUTE FUNCTION "public"."update_matching_parameters_updated_at"();



CREATE OR REPLACE TRIGGER "update_users_optimized_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_volunteer_time_tracking_updated_at" BEFORE UPDATE ON "public"."volunteer_time_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donation_requests"
    ADD CONSTRAINT "donation_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donation_requests"
    ADD CONSTRAINT "donation_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donations"
    ADD CONSTRAINT "donations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_rated_user_id_fkey" FOREIGN KEY ("rated_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."volunteer_requests"
    ADD CONSTRAINT "volunteer_requests_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."donation_requests"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all deliveries" ON "public"."deliveries" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all events" ON "public"."events" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated users can create donations" ON "public"."donations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can create events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can create requests" ON "public"."donation_requests" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Donors can manage own donations" ON "public"."donations" USING (("auth"."uid"() = "donor_id"));



CREATE POLICY "Event creators can update their events" ON "public"."events" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Everyone can view events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Public read access to users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Requesters can manage own requests" ON "public"."donation_requests" USING (("auth"."uid"() = "requester_id"));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "System can insert logs" ON "public"."system_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read active matching parameters" ON "public"."matching_parameters" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view all donations" ON "public"."donations" FOR SELECT USING (true);



CREATE POLICY "Users can view all requests" ON "public"."donation_requests" FOR SELECT USING (true);



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Volunteers can create deliveries" ON "public"."deliveries" FOR INSERT WITH CHECK (("volunteer_id" = "auth"."uid"()));



CREATE POLICY "Volunteers can create their own requests" ON "public"."volunteer_requests" FOR INSERT WITH CHECK (("volunteer_id" = "auth"."uid"()));



CREATE POLICY "Volunteers can update their deliveries" ON "public"."deliveries" FOR UPDATE USING (("volunteer_id" = "auth"."uid"()));



CREATE POLICY "Volunteers can view their own requests" ON "public"."volunteer_requests" FOR SELECT USING (("volunteer_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_volunteer_rating_average"("volunteer_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_volunteer_rating_average"("volunteer_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_volunteer_rating_average"("volunteer_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_profile_completion"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_profile_completion"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_profile_completion"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_backups"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_backups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_backups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_system_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_system_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_system_logs"("retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_weekly_backup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_weekly_backup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_weekly_backup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_volunteer_stats"("volunteer_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_volunteer_stats"("volunteer_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_volunteer_stats"("volunteer_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_users_to_optimized"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_users_to_optimized"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_users_to_optimized"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text", "p_ip" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text", "p_ip" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_failed_login"("p_email" "text", "p_ip" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_failed_logins"("p_email" "text", "p_ip" "inet") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_failed_logins"("p_email" "text", "p_ip" "inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_failed_logins"("p_email" "text", "p_ip" "inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_automatic_maintenance"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_automatic_maintenance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_automatic_maintenance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_old_backups"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_old_backups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_old_backups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_admin_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_direct_deliveries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_direct_deliveries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_direct_deliveries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_matching_parameters_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_matching_parameters_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_matching_parameters_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_volunteer_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_volunteer_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_volunteer_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_user_ids"("user_role" "text", "account_type" "text", "primary_id_type" "text", "secondary_id_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_user_ids"("user_role" "text", "account_type" "text", "primary_id_type" "text", "secondary_id_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_user_ids"("user_role" "text", "account_type" "text", "primary_id_type" "text", "secondary_id_type" "text") TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."active_users" TO "anon";
GRANT ALL ON TABLE "public"."active_users" TO "authenticated";
GRANT ALL ON TABLE "public"."active_users" TO "service_role";



GRANT ALL ON TABLE "public"."donations" TO "anon";
GRANT ALL ON TABLE "public"."donations" TO "authenticated";
GRANT ALL ON TABLE "public"."donations" TO "service_role";



GRANT ALL ON TABLE "public"."available_donations" TO "anon";
GRANT ALL ON TABLE "public"."available_donations" TO "authenticated";
GRANT ALL ON TABLE "public"."available_donations" TO "service_role";



GRANT ALL ON TABLE "public"."database_backups" TO "anon";
GRANT ALL ON TABLE "public"."database_backups" TO "authenticated";
GRANT ALL ON TABLE "public"."database_backups" TO "service_role";



GRANT ALL ON TABLE "public"."database_info" TO "anon";
GRANT ALL ON TABLE "public"."database_info" TO "authenticated";
GRANT ALL ON TABLE "public"."database_info" TO "service_role";



GRANT ALL ON TABLE "public"."deliveries" TO "anon";
GRANT ALL ON TABLE "public"."deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."donation_requests" TO "anon";
GRANT ALL ON TABLE "public"."donation_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."donation_requests" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."matching_parameters" TO "anon";
GRANT ALL ON TABLE "public"."matching_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."matching_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."performance_summary" TO "anon";
GRANT ALL ON TABLE "public"."performance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."platform_metrics" TO "anon";
GRANT ALL ON TABLE "public"."platform_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."system_health" TO "anon";
GRANT ALL ON TABLE "public"."system_health" TO "authenticated";
GRANT ALL ON TABLE "public"."system_health" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."volunteer_requests" TO "anon";
GRANT ALL ON TABLE "public"."volunteer_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."volunteer_requests" TO "service_role";



GRANT ALL ON TABLE "public"."volunteer_time_tracking" TO "anon";
GRANT ALL ON TABLE "public"."volunteer_time_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."volunteer_time_tracking" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
