import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Database,
  Key,
  Server,
  X
} from 'lucide-react'
import { getEnvironmentStatus, testSupabaseConnection, runSetupWizard } from '../../lib/devUtils'

const SetupGuide = ({ onClose }) => {
  const [envStatus, setEnvStatus] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    setIsLoading(true)
    
    // Check environment variables
    const status = getEnvironmentStatus()
    setEnvStatus(status)
    
    // Test connection if configured
    if (status.isConfigured) {
      const connected = await testSupabaseConnection()
      setConnectionStatus(connected)
    }
    
    setIsLoading(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const steps = [
    {
      title: 'Environment Configuration',
      icon: Key,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            First, you need to configure your environment variables for Supabase integration.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Environment Status</h4>
              <span className={`text-sm ${envStatus?.isConfigured ? 'text-green-600' : 'text-orange-600'}`}>
                {envStatus?.status}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {envStatus?.supabaseUrl ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm">Supabase URL</span>
              </div>
              <div className="flex items-center space-x-2">
                {envStatus?.supabaseKey ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm">Supabase Anonymous Key</span>
              </div>
            </div>
          </div>

          {!envStatus?.isConfigured && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Quick Setup:</h5>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                                 <li>2. Copy your Project URL and anon key from Settings to API page</li>
                <li>3. Update the .env file in your project root</li>
              </ol>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Database Setup',
      icon: Database,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Run the database migration script to create all necessary tables and functions.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Migration Script</h4>
            <p className="text-sm text-gray-600 mb-3">
              Copy and run this in your Supabase SQL Editor:
            </p>
            <div className="bg-gray-800 text-green-400 rounded p-3 text-sm font-mono">
              <div className="flex items-center justify-between mb-2">
                <span>hopelink_migration.sql</span>
                <button
                  onClick={() => copyToClipboard('Open Supabase SQL Editor and paste the contents of hopelink_migration.sql')}
                  className="text-gray-400 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs">
                -- Complete database schema with tables, functions, and policies
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-medium text-amber-900 mb-2">⚠️ Important:</h5>
            <p className="text-sm text-amber-800">
              The migration script includes Row Level Security policies. Make sure to run the complete script to ensure proper data protection.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Connection Test',
      icon: Server,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Let's test the connection to make sure everything is working properly.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Connection Status</h4>
              {connectionStatus !== null && (
                <span className={`text-sm ${connectionStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {connectionStatus ? '✅ Connected' : '❌ Failed'}
                </span>
              )}
            </div>
            
            {connectionStatus === false && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                <p className="font-medium">Connection failed. Please check:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Supabase URL and keys are correct</li>
                  <li>• Database migration has been run</li>
                  <li>• Your Supabase project is active</li>
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={checkEnvironment}
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      )
    }
  ]

  const isSetupComplete = envStatus?.isConfigured && connectionStatus === true

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-navy-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">HopeLink Setup Guide</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-primary-100 mt-2">
            Let's get your HopeLink platform configured and ready to use.
          </p>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      index < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3">
                {React.createElement(steps[currentStep].icon, { className: "h-6 w-6 text-primary-600" })}
                <h3 className="text-xl font-semibold">{steps[currentStep].title}</h3>
              </div>
              
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-3">
              {isSetupComplete && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Setup Complete!</span>
                </div>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="btn btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="btn btn-primary"
                >
                  {isSetupComplete ? 'Start Using HopeLink' : 'Close Guide'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SetupGuide 