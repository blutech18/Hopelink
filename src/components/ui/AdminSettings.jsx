import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Database, 
  Users,
  RefreshCw,
  Server,
  Activity,
  Download,
  Calendar,
  Plus,
  X
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import ConfirmationModal from './ConfirmationModal'
import LoadingSpinner from './LoadingSpinner'
import { db } from '../../lib/supabase'

// Component definitions outside to prevent re-creation
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


const AdminSettings = forwardRef(({ onUpdate, isEditing = true }, ref) => {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [originalSettings, setOriginalSettings] = useState(null)
  const [systemStatus, setSystemStatus] = useState({
    database: 'error',
    email: 'warning',
    storage: 'error'
  })
  const [backupStatus, setBackupStatus] = useState({
    status: 'warning',
    daysSinceLastBackup: null,
    nextBackupIn: null,
    lastBackupDate: null
  })
  const [automaticBackups, setAutomaticBackups] = useState([])
  const [manualBackups, setManualBackups] = useState([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [downloadingBackupId, setDownloadingBackupId] = useState(null) // Track which backup is currently downloading
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    backupId: null,
    backupType: null, // 'automatic' or 'manual'
    backupDate: null
  })
  const isCreatingBackup = useRef(false) // Prevent concurrent backup creation
  
  const [settings, setSettings] = useState({
    // System Monitoring - Actually implemented and functional
    enableSystemLogs: true,
    logRetentionDays: 30,
    
    // User Management - Actually implemented and functional
    requireIdVerification: true,
    auto_assign_enabled: false,
    expiry_retention_days: 30,
    donor_signup_enabled: true,
    recipient_signup_enabled: true,
    volunteer_signup_enabled: true
  })

  // Check system status with real health checks
  const checkSystemStatus = async () => {
    try {
      const healthStatus = await db.checkSystemHealth()
      setSystemStatus({
        database: healthStatus.database || 'error',
        email: healthStatus.email || 'warning',
        storage: healthStatus.storage || 'error'
      })
    } catch (error) {
      console.error('Error checking system status:', error)
      setSystemStatus({
        database: 'error',
        email: 'warning',
        storage: 'error'
      })
    }
  }

  // Check backup status
  const checkBackupStatus = async () => {
    try {
      // Get the most recent automatic backup
      const backups = await db.getDatabaseBackups('automatic')
      
      if (!backups || backups.length === 0) {
        // No backups found
        setBackupStatus({
          status: 'error',
          daysSinceLastBackup: null,
          nextBackupIn: null,
          lastBackupDate: null
        })
        return
      }

      const lastBackup = backups[0] // Most recent backup (already sorted by date descending)
      const lastBackupDate = new Date(lastBackup.backup_date || lastBackup.date)
      const now = new Date()
      
      // Calculate days since last backup
      const diffTime = now - lastBackupDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // Calculate next backup time (weekly backups - next Monday)
      const dayOfWeek = now.getDay()
      const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) // Days until next Monday
      const nextBackupDate = new Date(now)
      nextBackupDate.setDate(nextBackupDate.getDate() + daysToMonday)
      nextBackupDate.setHours(0, 0, 0, 0) // Set to start of Monday
      
      // If backup was created this week, next backup is next Monday
      // Otherwise, next backup could be calculated differently
      const diffToNext = nextBackupDate - now
      const daysToNext = Math.ceil(diffToNext / (1000 * 60 * 60 * 24))
      const hoursToNext = Math.ceil(diffToNext / (1000 * 60 * 60))
      
      // Determine status
      let status = 'healthy'
      if (diffDays > 14) {
        status = 'error' // More than 2 weeks since last backup
      } else if (diffDays > 7) {
        status = 'warning' // More than 1 week since last backup
      } else {
        status = 'healthy' // Backup within last week
      }

      setBackupStatus({
        status,
        daysSinceLastBackup: diffDays,
        nextBackupIn: { days: daysToNext, hours: hoursToNext },
        lastBackupDate: lastBackupDate
      })
    } catch (error) {
      console.error('Error checking backup status:', error)
      setBackupStatus({
        status: 'error',
        daysSinceLastBackup: null,
        nextBackupIn: null,
        lastBackupDate: null
      })
    }
  }

  // Load donation expiry stats
  const loadDonationStats = async () => {
    try {
      const stats = await db.getDonationExpiryStats()
      const expiredEl = document.getElementById('expiredCount')
      const archivedEl = document.getElementById('archivedCount')
      if (expiredEl) expiredEl.textContent = String(stats.expiredCount || 0)
      if (archivedEl) archivedEl.textContent = String(stats.archivedCount || 0)
    } catch (error) {
      console.error('Error loading donation stats:', error)
      const expiredEl = document.getElementById('expiredCount')
      const archivedEl = document.getElementById('archivedCount')
      if (expiredEl) expiredEl.textContent = '--'
      if (archivedEl) archivedEl.textContent = '--'
    }
  }

  useEffect(() => {
    let mounted = true
    
    // Load settings from backend (non-blocking)
    const loadSettings = async () => {
      try {
        // Don't show skeleton, just load in background
        const data = await db.getSettings()
        if (mounted && data) {
          // Merge with default settings to ensure all fields are present
          const loadedSettings = {
            enableSystemLogs: data.enableSystemLogs ?? true,
            logRetentionDays: data.logRetentionDays ?? 30,
            requireIdVerification: data.requireIdVerification ?? true,
            auto_assign_enabled: data.auto_assign_enabled ?? false,
            expiry_retention_days: data.expiry_retention_days ?? 30,
            donor_signup_enabled: data.donor_signup_enabled ?? true,
            recipient_signup_enabled: data.recipient_signup_enabled ?? true,
            volunteer_signup_enabled: data.volunteer_signup_enabled ?? true
          }
          setSettings(loadedSettings)
          // Store original settings for reset functionality (deep copy)
          setOriginalSettings({ ...loadedSettings })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        // Don't show toast on initial load failure, just use defaults
        // Settings will use default values from useState
      }
    }

    // Load database backups and check for automatic weekly backup
    const loadBackups = async () => {
      try {
        setLoadingBackups(true)
        
        // Check if weekly backup needs to be created automatically
        // Use a ref to prevent concurrent calls (race condition fix)
        if (!isCreatingBackup.current) {
          isCreatingBackup.current = true
          try {
            await db.checkAndCreateWeeklyBackup()
          } catch (backupError) {
            console.warn('Error creating automatic weekly backup:', backupError)
            // Continue loading existing backups even if auto-backup fails
          } finally {
            isCreatingBackup.current = false
          }
        }
        
        // Load automatic and manual backups separately
        // Use Promise.allSettled to handle individual failures gracefully
        const [automaticResult, manualResult] = await Promise.allSettled([
          db.getDatabaseBackups('automatic'),
          db.getDatabaseBackups('manual')
        ])
        
        if (mounted) {
          // Handle automatic backups
          const automaticBackupsData = automaticResult.status === 'fulfilled' 
            ? (automaticResult.value || [])
            : []
          
          // Handle manual backups
          const manualBackupsData = manualResult.status === 'fulfilled'
            ? (manualResult.value || [])
            : []
          
          // Sort by date descending
          const sortedAutomatic = automaticBackupsData
            .sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date))
          const sortedManual = manualBackupsData
            .sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date))
          
          setAutomaticBackups(sortedAutomatic)
          setManualBackups(sortedManual)
          
          // Update backup status after loading backups
          if (mounted) {
            checkBackupStatus()
          }
          
          // Log warnings if any failed (but don't show error to user - backups are non-critical)
          if (automaticResult.status === 'rejected') {
            console.warn('Failed to load automatic backups:', automaticResult.reason)
          }
          if (manualResult.status === 'rejected') {
            console.warn('Failed to load manual backups:', manualResult.reason)
          }
        }
      } catch (error) {
        console.error('Error loading backups:', error)
        // Fallback: show empty state - backups are non-critical functionality
        if (mounted) {
          setAutomaticBackups([])
          setManualBackups([])
        }
      } finally {
        if (mounted) {
          setLoadingBackups(false)
        }
      }
    }
    
    // Load data in background (non-blocking)
    // Settings, backups, and maintenance run asynchronously without blocking UI
    loadSettings()
    checkSystemStatus() // Check system health
    loadBackups() // This will also call checkBackupStatus() after loading backups
    loadDonationStats() // Load donation expiry stats
    
    // Run automatic maintenance on component mount (for admins)
    // This ensures both log cleanup and donation expiry run regularly
    const runMaintenance = async () => {
      try {
        await db.runAutomaticMaintenance()
      } catch (error) {
        console.warn('Error running automatic maintenance:', error)
        // Don't show error to user, maintenance runs silently
      }
    }
    
    // Run maintenance in background (with delay to avoid blocking UI)
    const maintenanceTimeout = setTimeout(() => {
      if (mounted) {
        runMaintenance()
      }
    }, 3000) // Run after 3 seconds to avoid blocking initial render
    
    // Set up interval to run maintenance every hour (optional, can be adjusted)
    const maintenanceInterval = setInterval(() => {
      if (mounted) {
        runMaintenance()
      }
    }, 60 * 60 * 1000) // 1 hour
    
    return () => {
      mounted = false
      clearTimeout(maintenanceTimeout)
      clearInterval(maintenanceInterval)
    }
  }, [])

  const handleDirectChange = (key, value) => {
    const updatedSettings = { ...settings, [key]: value }
    setSettings(updatedSettings)
    // Notify parent of changes - parent will compare with original to determine if dirty
    if (onUpdate) {
      onUpdate(updatedSettings, originalSettings)
    }
  }

  // Expose saveSettings and resetSettings to parent via ref
  useImperativeHandle(ref, () => ({
    saveSettings: async () => {
      try {
        setLoading(true)
        
        // Save to backend
        await db.updateSettings(settings)
        setOriginalSettings({ ...settings })
        success('Settings saved successfully')
        setLoading(false)
        return true
      } catch (error) {
        console.error('Error saving settings:', error)
        showError('Failed to save settings. Please try again.')
        setLoading(false)
        return false
      }
    },
    resetSettings: () => {
      // Reset settings to original values (loaded from database)
      if (originalSettings) {
        setSettings({ ...originalSettings })
        // Notify parent that settings have been reset (clear dirty state)
        if (onUpdate) {
          onUpdate({ ...originalSettings })
        }
      } else {
        // If no original settings, reload from database
        const reloadSettings = async () => {
          try {
            const data = await db.getSettings()
            if (data) {
              const resetSettings = {
                enableSystemLogs: data.enableSystemLogs ?? true,
                logRetentionDays: data.logRetentionDays ?? 30,
                requireIdVerification: data.requireIdVerification ?? true,
                auto_assign_enabled: data.auto_assign_enabled ?? false,
                expiry_retention_days: data.expiry_retention_days ?? 30,
                donor_signup_enabled: data.donor_signup_enabled ?? true,
                recipient_signup_enabled: data.recipient_signup_enabled ?? true,
                volunteer_signup_enabled: data.volunteer_signup_enabled ?? true
              }
              setSettings(resetSettings)
              setOriginalSettings({ ...resetSettings })
              // Notify parent that settings have been reset
              if (onUpdate) {
                onUpdate({ ...resetSettings })
              }
            }
          } catch (error) {
            console.error('Error reloading settings:', error)
          }
        }
        reloadSettings()
      }
    },
    getSettings: () => settings,
    getOriginalSettings: () => originalSettings
  }), [settings, originalSettings, onUpdate, showError, success])

  const handleResetToDefaults = () => {
    setShowResetConfirmation(true)
  }

  const confirmResetToDefaults = () => {
    // Reset to default values without page reload
    // Only updates local state - user must click "Save Changes" to persist
    setSettings({
      // System Monitoring
      enableSystemLogs: true,
      logRetentionDays: 30,
      
      // User Management
      requireIdVerification: true,
      auto_assign_enabled: false,
      expiry_retention_days: 30,
      donor_signup_enabled: true,
      recipient_signup_enabled: true,
      volunteer_signup_enabled: true
    })
    // Don't show toast - user must click "Save Changes" to save
    setShowResetConfirmation(false)
  }

  const handleDeleteBackup = (backupId, backupType, backupDate) => {
    setDeleteConfirmation({
      isOpen: true,
      backupId,
      backupType,
      backupDate
    })
  }

  const confirmDeleteBackup = async () => {
    if (!deleteConfirmation.backupId) return

    try {
      setLoading(true)
      await db.deleteDatabaseBackup(deleteConfirmation.backupId)
      
      // Refresh backups based on type
      if (deleteConfirmation.backupType === 'automatic') {
        const backups = await db.getDatabaseBackups('automatic')
        setAutomaticBackups(backups.sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date)))
      } else {
        const backups = await db.getDatabaseBackups('manual')
        setManualBackups(backups.sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date)))
      }
      
      // Refresh backup status after deletion
      await checkBackupStatus()
      
      success('Backup deleted successfully')
      setDeleteConfirmation({ isOpen: false, backupId: null, backupType: null, backupDate: null })
    } catch (e) {
      showError('Failed to delete backup: ' + (e.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  // Show UI immediately with default values
  // Settings will load in background and update when ready
  // This provides instant feedback without blocking the UI
  return (
    <div className="space-y-6">
      {/* Platform Settings Container - All sections inside */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 rounded-xl shadow-lg"
      >
        {/* Header */}
        <div className="border-b border-navy-700 pb-4 mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Settings className="h-5 w-5 text-yellow-400 mr-2" />
            Platform Settings
          </h2>
          <p className="text-sm text-yellow-300 mt-1">Configure and manage your HopeLink platform</p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* System Monitoring */}
            <div className="border border-navy-700 rounded-lg p-5">
              <div className="flex items-center mb-4 pb-3 border-b border-navy-700">
                <Server className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">System Monitoring</h3>
              </div>
              <div className="space-y-4">
                <ToggleSwitch
                  label="Enable System Logs"
                  description="Log system events and errors"
                  checked={settings.enableSystemLogs}
                  onChange={(checked) => handleDirectChange('enableSystemLogs', checked)}
                  disabled={false}
                />
                
                <div className="space-y-3">
                  <div>
                  <InputField
                    label="Log Retention (days)"
                    type="number"
                    value={settings.logRetentionDays}
                    onChange={(value) => handleDirectChange('logRetentionDays', parseInt(value) || 30)}
                    disabled={false}
                  />
                    <p className="text-xs text-gray-400 mt-1.5">Automatically delete system logs older than this number of days to manage storage space</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        const result = await db.cleanupOldSystemLogs(settings.logRetentionDays)
                        success(`Cleaned up ${result.deletedCount} old log(s)`)
                        await db.logSystemEvent('info', 'system', `Manual log cleanup: ${result.deletedCount} logs deleted`, { retentionDays: result.retentionDays })
                      } catch (e) {
                        showError('Failed to cleanup logs: ' + (e.message || 'Unknown error'))
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading || !settings.enableSystemLogs}
                    className="btn btn-secondary w-full text-sm py-2"
                    title="Manually cleanup old logs now"
                  >
                    Cleanup Logs Now
                  </button>
                </div>

                <div className="space-y-3 pt-4 border-t border-navy-700">
                  <div>
                    <InputField
                      label="Expiry Retention (days)"
                      type="number"
                      value={settings.expiry_retention_days ?? 30}
                      onChange={(value) => {
                        const updated = { ...settings, expiry_retention_days: parseInt(value || '0', 10) }
                        setSettings(updated)
                        if (onUpdate) {
                          onUpdate(updated)
                        }
                      }}
                      disabled={false}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">Number of days to keep expired donations before automatically archiving them</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="border border-navy-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-700">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-yellow-400 mr-2" />
                  <h3 className="text-lg font-semibold text-white">System Status</h3>
                </div>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      await Promise.all([
                        checkSystemStatus(),
                        loadDonationStats(),
                        checkBackupStatus()
                      ])
                      success('System status refreshed')
                    } catch (e) {
                      console.error('Error refreshing status:', e)
                      showError('Failed to refresh status')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="p-1.5 rounded hover:bg-navy-700 transition-colors disabled:opacity-50"
                  title="Refresh system status"
                >
                  <RefreshCw className={`h-4 w-4 text-yellow-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="space-y-4">
                <StatusIndicator status={systemStatus.database} label="Database Connection" />
                <StatusIndicator status={systemStatus.email} label="Email Service" />
                <StatusIndicator status={systemStatus.storage} label="File Storage" />
                
                {/* Database Backup Status */}
                <div className="pt-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white">Database Backups</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      backupStatus.status === 'healthy' ? 'text-green-400 bg-green-500/20' :
                      backupStatus.status === 'warning' ? 'text-yellow-400 bg-yellow-500/20' :
                      'text-red-400 bg-red-500/20'
                    }`}>
                      {backupStatus.status}
                    </span>
                  </div>
                  {backupStatus.lastBackupDate && (
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="text-gray-400">
                        Last backup: {backupStatus.daysSinceLastBackup !== null 
                          ? backupStatus.daysSinceLastBackup === 0 
                            ? 'Today' 
                            : backupStatus.daysSinceLastBackup === 1 
                              ? '1 day ago' 
                              : `${backupStatus.daysSinceLastBackup} days ago`
                          : 'Unknown'}
                        {' '}
                        <span className="text-gray-500">
                          ({backupStatus.lastBackupDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })})
                        </span>
                      </div>
                      {backupStatus.nextBackupIn && (
                        <div className="text-gray-400">
                          Next backup: {backupStatus.nextBackupIn.days > 0
                            ? backupStatus.nextBackupIn.days === 1
                              ? 'Tomorrow'
                              : `In ${backupStatus.nextBackupIn.days} days`
                            : backupStatus.nextBackupIn.hours > 0
                              ? `In ${backupStatus.nextBackupIn.hours} hours`
                              : 'Scheduled soon'}
                        </div>
                      )}
                    </div>
                  )}
                  {!backupStatus.lastBackupDate && backupStatus.status === 'error' && (
                    <div className="mt-2 text-xs text-red-400">
                      No backups found. Create a manual backup to get started.
                    </div>
                  )}
                </div>
                
                {/* Donation Expiry Stats */}
                <div className="pt-4 border-t border-navy-700">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-3">Donation Statistics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-navy-800 border border-navy-700">
                      <div className="text-yellow-300 text-xs mb-1">Expired Donations</div>
                      <div className="text-xl font-bold text-white" id="expiredCount">--</div>
                    </div>
                    <div className="p-3 rounded-lg bg-navy-800 border border-navy-700">
                      <div className="text-yellow-300 text-xs mb-1">Archived Donations</div>
                      <div className="text-xl font-bold text-white" id="archivedCount">--</div>
                    </div>
                  </div>
                </div>

                {/* Platform Version */}
                <div className="pt-4 border-t border-navy-700">
                  <div className="text-white text-sm mb-1">Platform Version: v1.0.0</div>
                  <div className="text-yellow-400 text-xs">Last updated: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* User Management */}
            <div className="border border-navy-700 rounded-lg p-5">
              <div className="flex items-center mb-4 pb-3 border-b border-navy-700">
                <Users className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">User Management</h3>
              </div>
              <div className="space-y-4">
                <ToggleSwitch
                  label="Auto-assign Volunteers"
                  description="Automatically select the top volunteer and request acceptance with timeout"
                  checked={!!settings.auto_assign_enabled}
                  onChange={(checked) => {
                    // Only update local state, don't save immediately
                    // Saving will happen when "Save Changes" button is clicked
                    handleDirectChange('auto_assign_enabled', checked)
                  }}
                  disabled={false}
                />

                <ToggleSwitch
                  label="Require ID Verification"
                  description="Users must provide valid ID for account verification"
                  checked={settings.requireIdVerification}
                  onChange={(checked) => handleDirectChange('requireIdVerification', checked)}
                  disabled={false}
                />

                {/* Role Signup Controls */}
                <div className="pt-4 border-t border-navy-700">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-3">Role Signup Controls</h4>
                  <p className="text-xs text-gray-400 mb-4">Disable signup for specific roles to prevent new registrations</p>
                <div className="space-y-3">
                    <ToggleSwitch
                      label="Donor Signup"
                      description="Allow new donors to sign up"
                      checked={settings.donor_signup_enabled !== false}
                      onChange={(checked) => handleDirectChange('donor_signup_enabled', checked)}
                      disabled={false}
                    />
                    <ToggleSwitch
                      label="Recipient Signup"
                      description="Allow new recipients to sign up"
                      checked={settings.recipient_signup_enabled !== false}
                      onChange={(checked) => handleDirectChange('recipient_signup_enabled', checked)}
                      disabled={false}
                    />
                    <ToggleSwitch
                      label="Volunteer Signup"
                      description="Allow new volunteers to sign up"
                      checked={settings.volunteer_signup_enabled !== false}
                      onChange={(checked) => handleDirectChange('volunteer_signup_enabled', checked)}
                    disabled={false}
                  />
                  </div>
                </div>
              </div>
            </div>

            {/* Database Backups */}
            <div className="border border-navy-700 rounded-lg p-5 space-y-6">
              {/* Automatic Weekly Backups */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-700">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-yellow-400 mr-2" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">Automatic Weekly Backups</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Limited to 5 most recent backups</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Prevent concurrent backup creation
                      if (isCreatingBackup.current) {
                        return
                      }
                      try {
                        setLoadingBackups(true)
                        isCreatingBackup.current = true
                        try {
                          await db.checkAndCreateWeeklyBackup()
                        } catch (backupError) {
                          console.warn('Error creating automatic weekly backup:', backupError)
                        } finally {
                          isCreatingBackup.current = false
                        }
                        const backups = await db.getDatabaseBackups('automatic')
                        setAutomaticBackups(backups.sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date)))
                        await checkBackupStatus()
                        success('Backups refreshed')
                      } catch (e) {
                        // Don't show error for network issues - backups are non-critical
                        const errorMsg = e.message || 'Unknown error'
                        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('network')) {
                          console.warn('Network error refreshing backups:', errorMsg)
                          // Still show success to avoid confusing user - backups will load when network is available
                          success('Refresh attempted. Backups may be unavailable due to network issues.')
                        } else {
                          showError('Failed to refresh backups: ' + errorMsg)
                        }
                      } finally {
                        setLoadingBackups(false)
                        isCreatingBackup.current = false
                      }
                    }}
                    disabled={loadingBackups || isCreatingBackup.current}
                    className="p-1.5 rounded hover:bg-navy-700 transition-colors disabled:opacity-50"
                    title="Refresh backups"
                  >
                    <RefreshCw className={`h-4 w-4 text-yellow-400 ${loadingBackups ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {loadingBackups && automaticBackups.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-4">Loading backups...</div>
                  ) : automaticBackups.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {automaticBackups.map((backup) => (
                        <div
                          key={backup.id}
                          className="relative flex flex-col p-3 rounded-lg bg-navy-800 border border-navy-700 hover:border-yellow-400/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteBackup(backup.id, 'automatic', backup.backup_date || backup.date)
                            }}
                            disabled={loading}
                            className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            title="Delete backup"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white font-medium truncate">
                                {new Date(backup.backup_date || backup.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mb-3">
                            {backup.file_size ? `${(backup.file_size / 1024 / 1024).toFixed(2)} MB` : backup.size || 'N/A'}
                          </div>
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              try {
                                setDownloadingBackupId(backup.id)
                                const blob = await db.downloadDatabaseBackup(backup.id)
                                const url = window.URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = backup.file_name || `backup-${new Date(backup.backup_date || backup.date).toISOString().split('T')[0]}.sql`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                window.URL.revokeObjectURL(url)
                              } catch (error) {
                                showError('Failed to download backup: ' + (error.message || 'Unknown error'))
                              } finally {
                                setDownloadingBackupId(null)
                              }
                            }}
                            disabled={downloadingBackupId === backup.id || loading}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            title="Download backup"
                          >
                            {downloadingBackupId === backup.id ? (
                              <>
                                <LoadingSpinner size="sm" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-4">No automatic backups available</div>
                  )}
                </div>
              </div>

              {/* Manual Backups */}
              <div className="border-t border-navy-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-yellow-400" />
                    <div>
                      <h3 className="text-base font-semibold text-white">Manual Backups</h3>
                      <p className="text-xs text-gray-400 mt-0.5">No limit - all manual backups are kept</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        setLoadingBackups(true)
                        await db.createDatabaseBackup('manual')
                        const backups = await db.getDatabaseBackups('manual')
                        setManualBackups(backups.sort((a, b) => new Date(b.backup_date || b.date) - new Date(a.backup_date || a.date)))
                        // Refresh backup status after creating backup
                        await checkBackupStatus()
                        success('Manual backup created successfully')
                      } catch (e) {
                        const errorMsg = e.message || 'Unknown error'
                        // Handle network errors with more helpful messages
                        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('network') || errorMsg.includes('502')) {
                          showError('Failed to create backup: Network connection error. Please check your internet connection and try again.')
                        } else {
                          showError('Failed to create backup: ' + errorMsg)
                        }
                      } finally {
                        setLoadingBackups(false)
                      }
                    }}
                    disabled={loadingBackups}
                    className="px-3 py-1.5 text-sm bg-yellow-400 hover:bg-yellow-500 text-navy-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title="Create manual backup"
                  >
                    {loadingBackups ? 'Creating...' : 'Create Backup'}
                  </button>
                </div>
                
                <div className="space-y-2">
                  {loadingBackups && manualBackups.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-4">Loading backups...</div>
                  ) : manualBackups.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {manualBackups.map((backup) => (
                        <div
                          key={backup.id}
                          className="relative flex flex-col p-3 rounded-lg bg-navy-800 border border-navy-700 hover:border-yellow-400/50 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteBackup(backup.id, 'manual', backup.backup_date || backup.date)
                            }}
                            disabled={loading}
                            className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            title="Delete backup"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white font-medium">
                                {new Date(backup.backup_date || backup.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-yellow-400/80 font-medium mt-0.5">
                                {new Date(backup.backup_date || backup.date).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                              </div>
                            </div>
                          <div className="text-xs text-gray-400 mb-3">
                            {backup.file_size ? `${(backup.file_size / 1024 / 1024).toFixed(2)} MB` : backup.size || 'N/A'}
                          </div>
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              try {
                                setDownloadingBackupId(backup.id)
                                const blob = await db.downloadDatabaseBackup(backup.id)
                                const url = window.URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = backup.file_name || `backup-${new Date(backup.backup_date || backup.date).toISOString().split('T')[0]}.sql`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                window.URL.revokeObjectURL(url)
                              } catch (error) {
                                showError('Failed to download backup: ' + (error.message || 'Unknown error'))
                              } finally {
                                setDownloadingBackupId(null)
                              }
                            }}
                            disabled={downloadingBackupId === backup.id || loading}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-yellow-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            title="Download backup"
                          >
                            {downloadingBackupId === backup.id ? (
                              <>
                                <LoadingSpinner size="sm" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-4">No manual backups yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reset Settings Confirmation Modal */}
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

      {/* Delete Backup Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, backupId: null, backupType: null, backupDate: null })}
        onConfirm={confirmDeleteBackup}
        title="Delete Backup"
        message={deleteConfirmation.backupDate 
          ? `Are you sure you want to delete the backup from ${new Date(deleteConfirmation.backupDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}? This action cannot be undone.`
          : "Are you sure you want to delete this backup? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        confirmButtonVariant="danger"
        loading={loading}
      />
    </div>
  )
})

AdminSettings.displayName = 'AdminSettings'

export default AdminSettings


