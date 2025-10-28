import React from 'react'
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'

const VerificationBadge = ({ isVerified, size = 'sm', showText = true, showDescription = false }) => {
  const sizeClasses = {
    xs: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
      description: 'text-xs'
    },
    sm: {
      container: 'px-3 py-1',
      icon: 'h-4 w-4',
      text: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-sm',
      description: 'text-xs'
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-6 w-6',
      text: 'text-base',
      description: 'text-sm'
    }
  }

  const classes = sizeClasses[size]

  if (isVerified) {
    return (
      <div className={`flex items-center bg-green-500/20 text-green-300 rounded-full border border-green-500/30 ${classes.container}`}>
        <CheckCircle className={`${classes.icon} ${showText ? 'mr-1' : ''}`} />
        {showText && (
          <div className={classes.text}>
            <div className="font-medium">Verified</div>
            {showDescription && (
              <div className={`${classes.description} text-green-400`}>Trusted by community</div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30 ${classes.container}`}>
      <AlertCircle className={`${classes.icon} ${showText ? 'mr-1' : ''}`} />
      {showText && (
        <div className={classes.text}>
          <div className="font-medium">Unverified</div>
          {showDescription && (
            <div className={`${classes.description} text-orange-400`}>Complete profile to verify</div>
          )}
        </div>
      )}
    </div>
  )
}

// New component for ID verification status
export const IDVerificationBadge = ({ 
  idStatus, 
  hasIdUploaded = false, 
  size = 'sm', 
  showText = true, 
  showDescription = false 
}) => {
  const sizeClasses = {
    xs: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
      description: 'text-xs'
    },
    sm: {
      container: 'px-3 py-1',
      icon: 'h-4 w-4',
      text: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-sm',
      description: 'text-xs'
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-6 w-6',
      text: 'text-base',
      description: 'text-sm'
    }
  }

  const classes = sizeClasses[size]

  // Determine status based on uploaded state and verification status
  let status, icon, bgColor, textColor, borderColor, label, description

  if (!hasIdUploaded) {
    // ID not uploaded - Profile incomplete
    status = 'required'
    icon = AlertCircle
    bgColor = 'bg-orange-500/20'
    textColor = 'text-orange-300'
    borderColor = 'border-orange-500/30'
    label = 'Profile Incomplete'
    description = 'Profile information missing'
  } else if (idStatus === 'pending') {
    // ID uploaded but waiting for admin approval
    status = 'pending'
    icon = Clock
    bgColor = 'bg-yellow-500/20'
    textColor = 'text-yellow-300'
    borderColor = 'border-yellow-500/30'
    label = 'Verifying'
    description = 'Account verification in progress'
  } else if (idStatus === 'verified') {
    // ID verified by admin
    status = 'verified'
    icon = CheckCircle
    bgColor = 'bg-green-500/20'
    textColor = 'text-green-300'
    borderColor = 'border-green-500/30'
    label = 'Verified'
    description = 'Account verified'
  } else if (idStatus === 'rejected') {
    // ID rejected by admin
    status = 'rejected'
    icon = AlertCircle
    bgColor = 'bg-orange-500/20'
    textColor = 'text-orange-300'
    borderColor = 'border-orange-500/30'
    label = 'Profile Incomplete'
    description = 'Profile needs completion'
  } else {
    // Default to pending if unknown status but ID uploaded
    status = 'pending'
    icon = Clock
    bgColor = 'bg-yellow-500/20'
    textColor = 'text-yellow-300'
    borderColor = 'border-yellow-500/30'
    label = 'Verifying'
    description = 'Account being verified'
  }

  const IconComponent = icon

  return (
    <div className={`flex items-center ${bgColor} ${textColor} rounded-full border ${borderColor} ${classes.container}`}>
      <IconComponent className={`${classes.icon} ${showText ? 'mr-1' : ''}`} />
      {showText && (
        <div className={classes.text}>
          <div className="font-medium">{label}</div>
          {showDescription && (
            <div className={`${classes.description} ${textColor.replace('text-', 'text-').replace('-300', '-400')}`}>
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VerificationBadge 