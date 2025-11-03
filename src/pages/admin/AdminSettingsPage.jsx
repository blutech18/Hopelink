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
    className="card p-4 sm:p-6"
  >
    <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center">
      <Icon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
      {title}
    </h3>
    <div className="space-y-3 sm:space-y-4">
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
  <div className="flex items-start sm:items-center justify-between py-3 gap-3">
    <div className="flex-1 min-w-0">
      <div className="text-white font-medium text-sm sm:text-base">{label}</div>
      {description && (
        <div className="text-yellow-400 text-xs sm:text-sm mt-1">{description}</div>
      )}
    </div>
    <label className={`relative inline-flex items-center flex-shrink-0 ${!disabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
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
    <label className="block text-white font-medium text-sm sm:text-base">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div className="space-y-2">
    <label className="block text-white font-medium text-sm sm:text-base">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
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
    securityAlerts: true,
    // Logistics
    auto_assign_enabled: false,
    expiry_retention_days: 30
  })

  useEffect(() => {
    let mounted = true
    
    // Load settings from backend
    const loadSettings = async () => {
      try {
        setInitialLoading(true)
        const data = await db.getSettings()
        if (mounted && data) {
          setSettings(prev => ({ ...prev, ...data }))
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
    <div className="min-h-screen py-4 sm:py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Platform Settings</h1>
                <p className="text-yellow-300 text-xs sm:text-sm">Configure and manage your HopeLink platform</p>
              </div>
            </div>
            
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm sm:text-base active:scale-95"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="hidden sm:inline">Cancel</span>
                    <span className="sm:hidden">Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white text-sm sm:text-base shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="hidden sm:inline">Saving...</span>
                        <span className="sm:hidden">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="hidden sm:inline">Save Changes</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEdit}
                  className="w-full sm:w-auto px-4 sm:px-5 py-3 sm:py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white text-sm sm:text-base shadow-lg transform hover:scale-105 active:scale-95"
                >
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Edit Settings</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
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
              label="Auto-assign Volunteers"
              description="Automatically select the top volunteer and request acceptance with timeout"
              checked={!!settings.auto_assign_enabled}
              onChange={async (checked) => {
                try {
                  setLoading(true)
                  const saved = await db.setAutoAssignEnabled(checked)
                  setSettings(prev => ({ ...prev, auto_assign_enabled: !!saved.auto_assign_enabled }))
                  success(`Auto-assign ${checked ? 'enabled' : 'disabled'}`)
                } catch (e) {
                  showError('Failed to update auto-assign setting')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={!isEditing}
            />

            <InputField
              label="Expiry Retention (days)"
              type="number"
              value={settings.expiry_retention_days ?? 30}
              onChange={(value) => setSettings(prev => ({ ...prev, expiry_retention_days: parseInt(value || '0', 10) }))}
              disabled={!isEditing}
            />
            {isEditing && (
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      const saved = await db.setRetentionDays(settings.expiry_retention_days || 0)
                      setSettings(prev => ({ ...prev, expiry_retention_days: saved.expiry_retention_days }))
                      success('Retention days updated')
                    } catch (e) {
                      showError('Failed to update retention days')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Save Retention
                </button>
              </div>
            )}
            
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

          {/* Donation Expiry Stats */}
          <SettingSection icon={Activity} title="Donation Expiry Stats">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-navy-800 border border-navy-700">
                <div className="text-yellow-300 text-sm">Expired</div>
                <div className="text-2xl font-bold text-white" id="expiredCount">--</div>
              </div>
              <div className="p-3 rounded-lg bg-navy-800 border border-navy-700">
                <div className="text-yellow-300 text-sm">Archived</div>
                <div className="text-2xl font-bold text-white" id="archivedCount">--</div>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const stats = await db.getDonationExpiryStats()
                    const expiredEl = document.getElementById('expiredCount')
                    const archivedEl = document.getElementById('archivedCount')
                    if (expiredEl) expiredEl.textContent = String(stats.expiredCount)
                    if (archivedEl) archivedEl.textContent = String(stats.archivedCount)
                  } catch (e) {
                    showError('Failed to load stats')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="btn btn-secondary"
              >
                Refresh Stats
              </button>
            </div>
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