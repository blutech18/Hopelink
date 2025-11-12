SELECT
  c.table_schema,
  c.table_name,
  c.ordinal_position AS column_position,
  c.column_name,
  c.data_type,
  c.udt_name AS underlying_type,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.is_nullable,
  c.column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'users',
    'donations',
    'deliveries',
    'user_profiles',
    'events',
    'feedbacks',
    'notifications',
    'database_backups',
    'donation_request',
    'login_attempts',
    'matching_parameters',
    'performance_matrics',
    'system_logs',
    'system_settings',
    'volunteer_request',
    'volunteer_time_tracking'
  )
ORDER BY c.table_name, c.ordinal_position;


