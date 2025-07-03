import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Mail,
  Lock,
  Globe,
  Palette,
  Users,
  Save,
  RefreshCw,
  Eye,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Server,
  Activity
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const AdminSettingsPage = () => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    database: 'healthy',
    email: 'healthy',
    storage: 'warning'
  })
  
  const [settings, setSettings] = useState({
    // Platform Settings
    platformName: 'HopeLink',
    platformDescription: 'Community-driven donation management platform',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    supportEmail: 'support@hopelink.org',
    maxFileUploadSize: 10, // MB
    
    // User Management
    autoApproveUsers: false,
    requireIdVerification: true,
    maxDonationsPerUser: 50,
    maxRequestsPerUser: 10,
    userSessionTimeout: 24, // hours
    
    // Content Moderation
    autoModerationEnabled: true,
    moderationKeywords: 'inappropriate, spam, scam',
    requireDonationApproval: false,
    flaggedContentThreshold: 3,
    
    // Email Configuration
    emailProvider: 'sendgrid',
    sendNotificationEmails: true,
    emailRateLimit: 100, // per hour per user
    
    // Security Settings
    passwordMinLength: 8,
    requireTwoFactor: false,
    maxLoginAttempts: 5,
    adminSessionTimeout: 60, // minutes
    
    // Platform Limits
    maxEventDuration: 30, // days
    maxDonationValue: 100000, // PHP
    donationCategories: 'Food, Clothing, Electronics, Books, Medical, Household',
    
    // System Monitoring
    enableSystemLogs: true,
    logRetentionDays: 30,
    enablePerformanceMonitoring: true,
    
    // Notification Settings
    emailNotifications: true,
    systemAlerts: true,
    securityAlerts: true
  })

  useEffect(() => {
    // Simulate system status check
    const checkSystemStatus = () => {
      // This would normally be an API call to check system health
      setSystemStatus({
        database: Math.random() > 0.1 ? 'healthy' : 'error',
        email: Math.random() > 0.2 ? 'healthy' : 'warning',
        storage: Math.random() > 0.3 ? 'healthy' : 'warning'
      })
    }
    
    checkSystemStatus()
    const interval = setInterval(checkSystemStatus, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const handleDirectChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      
      // Validate required fields
      if (!settings.platformName || !settings.supportEmail) {
        showToast('Platform name and support email are required', 'error')
        return
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      showToast('Settings saved successfully', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('Failed to save settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to their default values?')) {
      // Reset to default values
      window.location.reload()
    }
  }

  const SettingSection = ({ icon: Icon, title, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
        <Icon className="h-5 w-5 text-skyblue-400 mr-2" />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  )

  const ToggleSwitch = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="text-white font-medium">{label}</div>
        {description && (
          <div className="text-skyblue-400 text-sm mt-1">{description}</div>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-skyblue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-skyblue-600"></div>
      </label>
    </div>
  )

  const InputField = ({ label, value, onChange, type = "text", placeholder = "" }) => (
    <div className="space-y-2">
      <label className="block text-white font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-skyblue-400 focus:outline-none focus:ring-2 focus:ring-skyblue-500"
      />
    </div>
  )

  const SelectField = ({ label, value, onChange, options }) => (
    <div className="space-y-2">
      <label className="block text-white font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )

  const StatusIndicator = ({ status, label }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-white text-sm">{label}</span>
      <div className="flex items-center space-x-2">
        {status === 'healthy' && <CheckCircle className="h-4 w-4 text-green-400" />}
        {status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-400" />}
        {status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
        <span className={`text-xs ${
          status === 'healthy' ? 'text-green-400' : 
          status === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Error'}
        </span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy-950 py-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-skyblue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
                <p className="text-skyblue-300">Configure and manage your HopeLink platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetToDefaults}
                className="btn btn-secondary flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="btn btn-primary flex items-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Status */}
          <SettingSection icon={Activity} title="System Status">
            <StatusIndicator status={systemStatus.database} label="Database Connection" />
            <StatusIndicator status={systemStatus.email} label="Email Service" />
            <StatusIndicator status={systemStatus.storage} label="File Storage" />
            <div className="pt-3 border-t border-navy-700">
              <div className="text-white text-sm mb-2">Platform Version: v1.0.0</div>
              <div className="text-skyblue-400 text-xs">Last updated: {new Date().toLocaleDateString()}</div>
            </div>
          </SettingSection>

          {/* Platform Configuration */}
          <SettingSection icon={Globe} title="Platform Configuration">
            <InputField
              label="Platform Name"
              value={settings.platformName}
              onChange={(value) => handleDirectChange('platformName', value)}
            />
            
            <InputField
              label="Platform Description"
              value={settings.platformDescription}
              onChange={(value) => handleDirectChange('platformDescription', value)}
              placeholder="Brief description of your platform"
            />
            
            <InputField
              label="Support Email"
              type="email"
              value={settings.supportEmail}
              onChange={(value) => handleDirectChange('supportEmail', value)}
            />
            
            <ToggleSwitch
              label="Maintenance Mode"
              description="Temporarily disable platform access"
              checked={settings.maintenanceMode}
              onChange={(checked) => handleDirectChange('maintenanceMode', checked)}
            />
          </SettingSection>

          {/* User Management */}
          <SettingSection icon={Users} title="User Management">
            <ToggleSwitch
              label="Allow New Registrations"
              description="Enable new user sign-ups"
              checked={settings.registrationEnabled}
              onChange={(checked) => handleDirectChange('registrationEnabled', checked)}
            />
            
            <ToggleSwitch
              label="Email Verification Required"
              description="Users must verify their email address"
              checked={settings.emailVerificationRequired}
              onChange={(checked) => handleDirectChange('emailVerificationRequired', checked)}
            />
            
            <ToggleSwitch
              label="Require ID Verification"
              description="Users must provide valid ID for account verification"
              checked={settings.requireIdVerification}
              onChange={(checked) => handleDirectChange('requireIdVerification', checked)}
            />
            
            <InputField
              label="User Session Timeout (hours)"
              type="number"
              value={settings.userSessionTimeout}
              onChange={(value) => handleDirectChange('userSessionTimeout', parseInt(value))}
            />
          </SettingSection>

          {/* Content Moderation */}
          <SettingSection icon={Eye} title="Content Moderation">
            <ToggleSwitch
              label="Auto-Moderation"
              description="Automatically filter inappropriate content"
              checked={settings.autoModerationEnabled}
              onChange={(checked) => handleDirectChange('autoModerationEnabled', checked)}
            />
            
            <ToggleSwitch
              label="Require Donation Approval"
              description="Admin must approve donations before they're published"
              checked={settings.requireDonationApproval}
              onChange={(checked) => handleDirectChange('requireDonationApproval', checked)}
            />
            
            <InputField
              label="Moderation Keywords"
              value={settings.moderationKeywords}
              onChange={(value) => handleDirectChange('moderationKeywords', value)}
              placeholder="Comma-separated keywords to flag"
            />
            
            <InputField
              label="Auto-Flag Threshold"
              type="number"
              value={settings.flaggedContentThreshold}
              onChange={(value) => handleDirectChange('flaggedContentThreshold', parseInt(value))}
            />
          </SettingSection>

          {/* Platform Limits */}
          <SettingSection icon={DollarSign} title="Platform Limits">
            <InputField
              label="Max Donations per User"
              type="number"
              value={settings.maxDonationsPerUser}
              onChange={(value) => handleDirectChange('maxDonationsPerUser', parseInt(value))}
            />
            
            <InputField
              label="Max Requests per User"
              type="number"
              value={settings.maxRequestsPerUser}
              onChange={(value) => handleDirectChange('maxRequestsPerUser', parseInt(value))}
            />
            
            <InputField
              label="Max File Upload Size (MB)"
              type="number"
              value={settings.maxFileUploadSize}
              onChange={(value) => handleDirectChange('maxFileUploadSize', parseInt(value))}
            />
            
            <InputField
              label="Donation Categories"
              value={settings.donationCategories}
              onChange={(value) => handleDirectChange('donationCategories', value)}
              placeholder="Comma-separated categories"
            />
          </SettingSection>

          {/* Security Settings */}
          <SettingSection icon={Shield} title="Security Settings">
            <InputField
              label="Minimum Password Length"
              type="number"
              value={settings.passwordMinLength}
              onChange={(value) => handleDirectChange('passwordMinLength', parseInt(value))}
            />
            
            <InputField
              label="Max Login Attempts"
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(value) => handleDirectChange('maxLoginAttempts', parseInt(value))}
            />
            
            <InputField
              label="Admin Session Timeout (minutes)"
              type="number"
              value={settings.adminSessionTimeout}
              onChange={(value) => handleDirectChange('adminSessionTimeout', parseInt(value))}
            />
            
            <ToggleSwitch
              label="Require Two-Factor Authentication"
              description="Enable 2FA for admin accounts"
              checked={settings.requireTwoFactor}
              onChange={(checked) => handleDirectChange('requireTwoFactor', checked)}
            />
          </SettingSection>

          {/* Email Configuration */}
          <SettingSection icon={Mail} title="Email Configuration">
            <SelectField
              label="Email Provider"
              value={settings.emailProvider}
              onChange={(value) => handleDirectChange('emailProvider', value)}
              options={[
                { value: 'sendgrid', label: 'SendGrid' },
                { value: 'smtp', label: 'SMTP' },
                { value: 'disabled', label: 'Disabled' }
              ]}
            />
            
            <ToggleSwitch
              label="Send Notification Emails"
              description="Enable email notifications to users"
              checked={settings.sendNotificationEmails}
              onChange={(checked) => handleDirectChange('sendNotificationEmails', checked)}
            />
            
            <InputField
              label="Email Rate Limit (per hour)"
              type="number"
              value={settings.emailRateLimit}
              onChange={(value) => handleDirectChange('emailRateLimit', parseInt(value))}
            />
          </SettingSection>

          {/* System Monitoring */}
          <SettingSection icon={Server} title="System Monitoring">
            <ToggleSwitch
              label="Enable System Logs"
              description="Log system events and errors"
              checked={settings.enableSystemLogs}
              onChange={(checked) => handleDirectChange('enableSystemLogs', checked)}
            />
            
            <ToggleSwitch
              label="Performance Monitoring"
              description="Track system performance metrics"
              checked={settings.enablePerformanceMonitoring}
              onChange={(checked) => handleDirectChange('enablePerformanceMonitoring', checked)}
            />
            
            <InputField
              label="Log Retention (days)"
              type="number"
              value={settings.logRetentionDays}
              onChange={(value) => handleDirectChange('logRetentionDays', parseInt(value))}
            />
          </SettingSection>

          {/* Notification Settings */}
          <SettingSection icon={Bell} title="Admin Notifications">
            <ToggleSwitch
              label="Email Notifications"
              description="Receive admin notifications via email"
              checked={settings.emailNotifications}
              onChange={(checked) => handleDirectChange('emailNotifications', checked)}
            />
            
            <ToggleSwitch
              label="System Alerts"
              description="Get notified of system issues"
              checked={settings.systemAlerts}
              onChange={(checked) => handleDirectChange('systemAlerts', checked)}
            />
            
            <ToggleSwitch
              label="Security Alerts"
              description="Receive security-related notifications"
              checked={settings.securityAlerts}
              onChange={(checked) => handleDirectChange('securityAlerts', checked)}
            />
          </SettingSection>
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage 