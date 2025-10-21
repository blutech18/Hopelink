-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Platform Settings
  platform_name TEXT DEFAULT 'HopeLink',
  platform_description TEXT DEFAULT 'Community-driven donation management platform',
  maintenance_mode BOOLEAN DEFAULT false,
  registration_enabled BOOLEAN DEFAULT true,
  email_verification_required BOOLEAN DEFAULT true,
  support_email TEXT DEFAULT 'support@hopelink.org',
  
  -- User Management
  require_id_verification BOOLEAN DEFAULT true,
  
  -- Security Settings
  password_min_length INTEGER DEFAULT 8,
  max_login_attempts INTEGER DEFAULT 5,
  require_two_factor BOOLEAN DEFAULT false,
  
  -- System Monitoring
  enable_system_logs BOOLEAN DEFAULT true,
  log_retention_days INTEGER DEFAULT 30,
  enable_performance_monitoring BOOLEAN DEFAULT true,
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  system_alerts BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_id ON admin_settings(id);

-- Insert default settings if table is empty
INSERT INTO admin_settings (
  platform_name,
  platform_description,
  maintenance_mode,
  registration_enabled,
  email_verification_required,
  support_email,
  require_id_verification,
  password_min_length,
  max_login_attempts,
  require_two_factor,
  enable_system_logs,
  log_retention_days,
  enable_performance_monitoring,
  email_notifications,
  system_alerts,
  security_alerts
)
SELECT 
  'HopeLink',
  'Community-driven donation management platform',
  false,
  true,
  true,
  'support@hopelink.org',
  true,
  8,
  5,
  false,
  true,
  30,
  true,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Enable Row Level Security
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can read settings
CREATE POLICY "Admins can read settings"
  ON admin_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policy: Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON admin_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policy: Only admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_settings_timestamp
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();
