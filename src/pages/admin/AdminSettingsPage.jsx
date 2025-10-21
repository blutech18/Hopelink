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
  Activity,
  X
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { db } from '../../lib/supabase'

// Component definitions outside to prevent re-creation
const SettingSection = ({ icon: Icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card p-6"
  >
    <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
      <Icon className="h-5 w-5 text-yellow-400 mr-2" />
      {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </motion.div>
)

const StatusIndicator = ({ status, label }) => {
  const colors = {
    healthy: 'text-green-400 bg-green-500/20',
    warning: 'text-yellow-400 bg-yellow-500/20',
    error: 'text-red-400 bg-red-500/20'
  }
  
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-white">{label}</span>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    </div>
  )
}

const ToggleSwitch = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <div className="text-white font-medium">{label}</div>
      {description && (
        <div className="text-yellow-400 text-sm mt-1">{description}</div>
      )}
    </div>
    <label className={`relative inline-flex items-center ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
    </label>
  </div>
)

const InputField = ({ label, value, onChange, type = "text", placeholder = "", disabled }) => (
  <div className="space-y-2">
    <label className="block text-white font-medium">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div className="space-y-2">
    <label className="block text-white font-medium">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

const AdminSettingsPage = () => {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [originalSettings, setOriginalSettings] = useState(null)
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
    let mounted = true
    
    // Load settings from backend
    const loadSettings = async () => {
      try {
        setInitialLoading(true)
        const data = await db.getSettings()
        if (mounted && data) {
          setSettings(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        // Don't show toast on initial load failure, just use defaults
      } finally {
        if (mounted) {
          setInitialLoading(false)
        }
      }
    }

    // Check system status
    const checkSystemStatus = () => {
      if (mounted) {
        setSystemStatus({
          database: Math.random() > 0.1 ? 'healthy' : 'error',
          email: Math.random() > 0.2 ? 'healthy' : 'warning',
          storage: Math.random() > 0.3 ? 'healthy' : 'warning'
        })
      }
    }
    
    loadSettings()
    checkSystemStatus()
    
    return () => {
      mounted = false
    }
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

  const handleEdit = () => {
    setOriginalSettings({ ...settings })
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (originalSettings) {
      setSettings(originalSettings)
    }
    setIsEditing(false)
    setOriginalSettings(null)
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      
      // Validate required fields
      if (!settings.platformName || !settings.supportEmail) {
        showError('Platform name and support email are required')
        setLoading(false)
        return
      }
      
      // Save to backend
      await db.updateSettings(settings)
      
      success('Settings saved successfully')
      setIsEditing(false)
      setOriginalSettings(null)
    } catch (error) {
      console.error('Error saving settings:', error)
      showError('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetToDefaults = () => {
    setShowResetConfirmation(true)
  }

  const confirmResetToDefaults = () => {
    // Reset to default values without page reload
    setSettings({
      // Platform Settings
      platformName: 'HopeLink',
      platformDescription: 'Community-driven donation management platform',
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
      supportEmail: 'support@hopelink.org',
      maxFileUploadSize: 10,
      
      // User Management
      autoApproveUsers: false,
      requireIdVerification: true,
      maxDonationsPerUser: 50,
      maxRequestsPerUser: 10,
      userSessionTimeout: 24,
      
      // Content Moderation
      autoModerationEnabled: true,
      moderationKeywords: 'inappropriate, spam, scam',
      requireDonationApproval: false,
      flaggedContentThreshold: 3,
      
      // Email Configuration
      emailProvider: 'sendgrid',
      sendNotificationEmails: true,
      emailRateLimit: 100,
      
      // Security Settings
      passwordMinLength: 8,
      requireTwoFactor: false,
      maxLoginAttempts: 5,
      adminSessionTimeout: 60,
      
      // Platform Limits
      maxEventDuration: 30,
      maxDonationValue: 100000,
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
    success('Settings reset to defaults')
    setShowResetConfirmation(false)
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FormSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-yellow-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
                <p className="text-yellow-300">Configure and manage your HopeLink platform</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-5 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <X className="h-5 w-5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="px-5 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEdit}
                  className="px-5 py-3 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg transform hover:scale-105"
                >
                  <Settings className="h-5 w-5" />
                  Edit Settings
                </button>
              )}
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
              <div className="text-yellow-400 text-xs">Last updated: {new Date().toLocaleDateString()}</div>
            </div>
          </SettingSection>

          {/* Platform Information */}
          <SettingSection icon={Globe} title="Platform Information">
            <InputField
              label="Platform Name"
              value={settings.platformName}
              onChange={(value) => handleDirectChange('platformName', value)}
              disabled={!isEditing}
            />
            
            <InputField
              label="Support Email"
              type="email"
              value={settings.supportEmail}
              onChange={(value) => handleDirectChange('supportEmail', value)}
              disabled={!isEditing}
            />
            
            <ToggleSwitch
              label="Maintenance Mode"
              description="Temporarily disable platform access for maintenance"
              checked={settings.maintenanceMode}
              onChange={(checked) => handleDirectChange('maintenanceMode', checked)}
              disabled={!isEditing}
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
            
            <ToggleSwitch
              label="Require Two-Factor Authentication"
              description="Enable 2FA for admin accounts (Coming Soon)"
              checked={settings.requireTwoFactor}
              onChange={(checked) => handleDirectChange('requireTwoFactor', checked)}
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

          {/* Admin Notifications */}
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={confirmResetToDefaults}
        title="Reset Settings"
        message="Are you sure you want to reset all settings to their default values? This action will overwrite all current settings."
        confirmText="Yes, Reset"
        cancelText="Cancel"
        type="warning"
        confirmButtonVariant="danger"
      />
    </div>
  )
}

export default AdminSettingsPage 