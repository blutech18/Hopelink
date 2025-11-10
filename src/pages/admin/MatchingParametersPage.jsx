import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Save, 
  RefreshCw, 
  AlertCircle,
  Package,
  X,
  RotateCcw
} from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { FormSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { db } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

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

const ToggleSwitch = ({ label, description, checked, onChange }) => (
  <div className="flex items-start sm:items-center justify-between py-3 gap-3">
    <div className="flex-1 min-w-0">
      <div className="text-white font-medium text-sm sm:text-base">{label}</div>
      {description && (
        <div className="text-yellow-400 text-xs sm:text-sm mt-1">{description}</div>
      )}
    </div>
    <label className="relative inline-flex items-center flex-shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
    </label>
  </div>
)

const InputField = ({ label, value, onChange, type = "number", placeholder = "", min, max, step = 0.01 }) => (
  <div className="space-y-2">
    <label className="block text-white font-medium text-sm sm:text-base">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className="w-full px-4 py-2.5 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
    />
  </div>
)

const WeightInput = ({ label, value, onChange }) => {
  const percentage = Math.round((value || 0) * 100)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-white font-medium text-sm sm:text-base">{label}</label>
        <span className="text-yellow-400 font-semibold text-sm">{percentage}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value || 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
      />
    </div>
  )
}

// Default weights from the algorithm (as stated in manuscript)
// These weights apply to matching donors, recipients, and volunteers together
const DEFAULT_WEIGHTS = {
  DONOR_RECIPIENT_VOLUNTEER: {
    geographic_proximity: 0.30,        // Distance between donor, recipient, and volunteer (shared)
    item_compatibility: 0.25,          // How well donor's item matches recipient's request and volunteer's preferred delivery types (shared)
    urgency_alignment: 0.20,           // Priority matching for urgent requests
    user_reliability: 0.15,            // User ratings and history (donors, recipients, volunteers)
    delivery_compatibility: 0.10       // Delivery method preferences (shared by all parties)
  }
}

const MatchingParametersPage = () => {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const originalParametersRef = useRef(null)
  
  const [parameters, setParameters] = useState({
    DONOR_RECIPIENT_VOLUNTEER: {
      weights: {
        geographic_proximity: 0.30,        // Shared: Distance between donor, recipient, and volunteer
        item_compatibility: 0.25,          // Shared: Donor's item matches recipient's request and volunteer's preferred delivery types
        urgency_alignment: 0.20,           // Priority matching for urgent requests
        user_reliability: 0.15,            // User ratings and history (all parties)
        delivery_compatibility: 0.10       // Shared: Delivery method preferences
      },
      auto_match_enabled: false,
      auto_match_threshold: 0.75,
      auto_claim_threshold: 0.85,
      max_distance_km: 50,
      min_quantity_match_ratio: 0.8,
      perishable_geographic_boost: 0.35,
      critical_urgency_boost: 0.30
    }
  })

  useEffect(() => {
    loadParameters()
  }, [])

  // Check for changes whenever parameters change
  useEffect(() => {
    if (originalParametersRef.current) {
      const hasChanges = JSON.stringify(parameters) !== JSON.stringify(originalParametersRef.current)
      setHasChanges(hasChanges)
    }
  }, [parameters])

  const loadParameters = async () => {
    try {
      setInitialLoading(true)
      const params = await db.getMatchingParameters()
      // Load DONOR_RECIPIENT_VOLUNTEER parameters, or fallback to DONOR_RECIPIENT if it exists
      const matchingParams = params?.DONOR_RECIPIENT_VOLUNTEER || params?.DONOR_RECIPIENT
      if (matchingParams) {
        // Filter weights to only include the 5 unified matching weights
        // Remove volunteer-specific weights that are not used in unified matching
        const filteredWeights = {
          geographic_proximity: matchingParams.weights?.geographic_proximity ?? DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER.geographic_proximity,
          item_compatibility: matchingParams.weights?.item_compatibility ?? DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER.item_compatibility,
          urgency_alignment: matchingParams.weights?.urgency_alignment ?? DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER.urgency_alignment,
          user_reliability: matchingParams.weights?.user_reliability ?? DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER.user_reliability,
          delivery_compatibility: matchingParams.weights?.delivery_compatibility ?? DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER.delivery_compatibility
        }
        
        const cleanedParams = {
          ...matchingParams,
          weights: filteredWeights
        }
        
        setParameters({
          DONOR_RECIPIENT_VOLUNTEER: cleanedParams
        })
        originalParametersRef.current = JSON.parse(JSON.stringify({
          DONOR_RECIPIENT_VOLUNTEER: cleanedParams
        }))
        setHasChanges(false)
      } else {
        // If no parameters found, use defaults
        setParameters({
          DONOR_RECIPIENT_VOLUNTEER: {
            weights: { ...DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER },
            auto_match_enabled: false,
            auto_match_threshold: 0.75,
            auto_claim_threshold: 0.85,
            max_distance_km: 50,
            min_quantity_match_ratio: 0.8,
            perishable_geographic_boost: 0.35,
            critical_urgency_boost: 0.30
          }
        })
        originalParametersRef.current = JSON.parse(JSON.stringify({
          DONOR_RECIPIENT_VOLUNTEER: {
            weights: { ...DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER },
            auto_match_enabled: false,
            auto_match_threshold: 0.75,
            auto_claim_threshold: 0.85,
            max_distance_km: 50,
            min_quantity_match_ratio: 0.8,
            perishable_geographic_boost: 0.35,
            critical_urgency_boost: 0.30
          }
        }))
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error loading matching parameters:', error)
      showError('Failed to load matching parameters')
    } finally {
      setInitialLoading(false)
    }
  }

  const updateParameterGroup = (updates) => {
    setParameters(prev => ({
      ...prev,
      DONOR_RECIPIENT_VOLUNTEER: {
        ...prev.DONOR_RECIPIENT_VOLUNTEER,
        ...updates
      }
    }))
  }

  const updateWeight = (weightKey, value) => {
    setParameters(prev => ({
      ...prev,
      DONOR_RECIPIENT_VOLUNTEER: {
        ...prev.DONOR_RECIPIENT_VOLUNTEER,
        weights: {
          ...prev.DONOR_RECIPIENT_VOLUNTEER.weights,
          [weightKey]: value
        }
      }
    }))
  }

  const calculateWeightSum = () => {
    const weights = parameters.DONOR_RECIPIENT_VOLUNTEER?.weights || {}
    // Only sum the 5 unified matching weights (exclude volunteer-specific weights that are not used)
    const unifiedWeights = [
      weights.geographic_proximity || 0,
      weights.item_compatibility || 0,
      weights.urgency_alignment || 0,
      weights.user_reliability || 0,
      weights.delivery_compatibility || 0
    ]
    return unifiedWeights.reduce((sum, w) => sum + (w || 0), 0)
  }

  const resetToDefaults = () => {
    setParameters(prev => ({
      ...prev,
      DONOR_RECIPIENT_VOLUNTEER: {
        ...prev.DONOR_RECIPIENT_VOLUNTEER,
        weights: { ...DEFAULT_WEIGHTS.DONOR_RECIPIENT_VOLUNTEER }
      }
    }))
    success('Matching weights reset to default values')
  }

  const handleSaveClick = () => {
    // Validate weight sums before showing confirmation
    const weightSum = calculateWeightSum()
    
    if (Math.abs(weightSum - 1.0) > 0.05) {
      showError(`Matching weights must sum to 100% (currently ${Math.round(weightSum * 100)}%)`)
      return
    }

    setShowSaveConfirmation(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setShowSaveConfirmation(false)

      // Save DONOR_RECIPIENT_VOLUNTEER parameters
      const config = parameters.DONOR_RECIPIENT_VOLUNTEER
      const updates = {
        geographic_proximity_weight: config.weights.geographic_proximity || 0,
        item_compatibility_weight: config.weights.item_compatibility || 0,
        urgency_alignment_weight: config.weights.urgency_alignment || 0,
        user_reliability_weight: config.weights.user_reliability || 0,
        delivery_compatibility_weight: config.weights.delivery_compatibility || 0,
        auto_match_enabled: config.auto_match_enabled || false,
        auto_match_threshold: config.auto_match_threshold || 0.75,
        auto_claim_threshold: config.auto_claim_threshold || 0.85,
        max_matching_distance_km: config.max_distance_km || 50,
        min_quantity_match_ratio: config.min_quantity_match_ratio || 0.8,
        perishable_geographic_boost: config.perishable_geographic_boost || 0.35,
        critical_urgency_boost: config.critical_urgency_boost || 0.30
      }
      
      await db.updateMatchingParameters('DONOR_RECIPIENT_VOLUNTEER', updates, user?.id)
      
      // Update original parameters reference
      originalParametersRef.current = JSON.parse(JSON.stringify(parameters))
      setHasChanges(false)
      success('Matching parameters saved successfully!')
    } catch (error) {
      console.error('Error saving matching parameters:', error)
      showError('Failed to save matching parameters. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (originalParametersRef.current) {
      setParameters(JSON.parse(JSON.stringify(originalParametersRef.current)))
      setHasChanges(false)
    }
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

  const weightSum = calculateWeightSum()

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
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Matching Parameters</h1>
                <p className="text-yellow-300 text-xs sm:text-sm">Configure intelligent matching algorithm settings for donors, recipients, and volunteers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={resetToDefaults}
                disabled={loading || saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Use Default"
                type="button"
                aria-label="Use Default"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Use Default</span>
              </button>
              <button
                onClick={loadParameters}
                disabled={loading || saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh"
                type="button"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Settings Container */}
        <div>
          {/* Weight Sum Warning */}
          {Math.abs(weightSum - 1.0) > 0.05 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-500/20 border-2 border-red-500/50 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-1 text-sm">Weight Sum Validation</h3>
                <p className="text-red-300/80 text-xs">
                  The matching weights must sum to 100%. Current total: {Math.round(weightSum * 100)}%. 
                  Please adjust the weights to ensure they sum to exactly 100%.
                </p>
              </div>
            </motion.div>
          )}

          <SettingSection
            icon={Package}
            title="Donor-Recipient-Volunteer Matching"
          >
              <div className="bg-navy-800/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">Weight Sum</span>
                  <span className={`font-semibold text-sm ${Math.abs(weightSum - 1.0) <= 0.05 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.round(weightSum * 100)}%
                  </span>
                </div>
              </div>

            <div className="space-y-4 mb-4">
              <p className="text-yellow-400 text-xs sm:text-sm">
                These weights apply to matching donors, recipients, and volunteers together. 
                Geographic Proximity, Item Compatibility, and Delivery Compatibility are shared criteria across all three parties.
              </p>
            </div>

            <WeightInput
              label="Geographic Proximity (Shared)"
              value={parameters.DONOR_RECIPIENT_VOLUNTEER.weights.geographic_proximity}
              onChange={(v) => updateWeight('geographic_proximity', v)}
            />
            <div className="text-xs text-gray-400 ml-1 -mt-2 mb-2">
              Distance between donor, recipient, and volunteer locations
            </div>

            <WeightInput
              label="Item Compatibility (Shared)"
              value={parameters.DONOR_RECIPIENT_VOLUNTEER.weights.item_compatibility}
              onChange={(v) => updateWeight('item_compatibility', v)}
            />
            <div className="text-xs text-gray-400 ml-1 -mt-2 mb-2">
              How well donor's item matches recipient's request and volunteer's preferred delivery types
            </div>

            <WeightInput
              label="Urgency Alignment"
              value={parameters.DONOR_RECIPIENT_VOLUNTEER.weights.urgency_alignment}
              onChange={(v) => updateWeight('urgency_alignment', v)}
            />
            <div className="text-xs text-gray-400 ml-1 -mt-2 mb-2">
              Priority matching for urgent requests
            </div>

            <WeightInput
              label="User Reliability"
              value={parameters.DONOR_RECIPIENT_VOLUNTEER.weights.user_reliability}
              onChange={(v) => updateWeight('user_reliability', v)}
            />
            <div className="text-xs text-gray-400 ml-1 -mt-2 mb-2">
              User ratings and history (donors, recipients, and volunteers)
            </div>

            <WeightInput
              label="Delivery Compatibility (Shared)"
              value={parameters.DONOR_RECIPIENT_VOLUNTEER.weights.delivery_compatibility}
              onChange={(v) => updateWeight('delivery_compatibility', v)}
            />
            <div className="text-xs text-gray-400 ml-1 -mt-2 mb-2">
              Delivery method preferences shared by all parties
            </div>

            <div className="border-t border-navy-700 pt-4 mt-4">
              <ToggleSwitch
                label="Enable Automatic Matching"
                description="Automatically match donations to requests with volunteers when created"
                checked={parameters.DONOR_RECIPIENT_VOLUNTEER.auto_match_enabled}
                onChange={(v) => updateParameterGroup({ auto_match_enabled: v })}
              />
            </div>

            {parameters.DONOR_RECIPIENT_VOLUNTEER.auto_match_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <InputField
                  label="Auto-Match Threshold"
                  value={parameters.DONOR_RECIPIENT_VOLUNTEER.auto_match_threshold}
                  onChange={(v) => updateParameterGroup({ auto_match_threshold: v })}
                  min={0}
                  max={1}
                  step={0.01}
                />
                <InputField
                  label="Auto-Claim Threshold"
                  value={parameters.DONOR_RECIPIENT_VOLUNTEER.auto_claim_threshold}
                  onChange={(v) => updateParameterGroup({ auto_claim_threshold: v })}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            )}

            <div className="border-t border-navy-700 pt-4 mt-4 space-y-4">
              <InputField
                label="Maximum Matching Distance (km)"
                value={parameters.DONOR_RECIPIENT_VOLUNTEER.max_distance_km}
                onChange={(v) => updateParameterGroup({ max_distance_km: v })}
                min={1}
                max={500}
                step={1}
              />
            </div>
          </SettingSection>
        </div>

        {/* Sticky Save Button - Only visible when there are unsaved changes */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.25 },
                scale: { duration: 0.3 }
              }}
              className="sticky bottom-4 z-50 mt-8 flex justify-center"
            >
              <div className="bg-gradient-to-r from-navy-800 to-navy-900 border border-yellow-400/30 rounded-lg p-2.5 shadow-2xl backdrop-blur-sm w-full max-w-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center text-yellow-300">
                    <AlertCircle className="h-2.5 w-2.5 mr-1.5" />
                    <span className="text-xs font-medium">You have unsaved changes</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="btn btn-primary flex items-center justify-center flex-1 text-xs px-3.5 py-1.5 active:scale-95 font-semibold shadow-lg"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-1.5">Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn btn-secondary flex items-center justify-center sm:flex-none sm:px-3.5 text-xs px-3.5 py-1.5 active:scale-95 font-semibold"
                  >
                    <X className="h-3 w-3 mr-1.5" />
                    Discard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={handleSave}
          title="Save Matching Parameters"
          message="Are you sure you want to save these matching parameter changes? This will update how the system matches donors, recipients, and volunteers together."
          confirmText="Save Changes"
          cancelText="Cancel"
          type="warning"
          loading={saving}
        />
      </div>
    </div>
  )
}

export default MatchingParametersPage
