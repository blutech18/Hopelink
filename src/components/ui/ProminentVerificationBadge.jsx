import React from 'react'
import { CheckCircle, AlertCircle, Clock, Award, Shield } from 'lucide-react'

const ProminentVerificationBadge = ({ 
  recipient, 
  size = 'md',
  showLevel = true,
  showDescription = false 
}) => {
  if (!recipient) return null

  const getVerificationLevel = () => {
    if (!recipient.primary_id_type || !recipient.primary_id_number) {
      return {
        level: 'unverified',
        label: 'Unverified',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-400/30',
        icon: AlertCircle,
        description: 'ID verification required',
        priority: 0
      }
    }
    
    if (recipient.id_verification_status === 'verified') {
      const completedCount = recipient.completed_requests_count || 0
      if (completedCount >= 5) {
        return {
          level: 'trusted',
          label: 'Trusted Member',
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-400/30',
          icon: Award,
          description: 'Verified with excellent standing',
          priority: 3
        }
      }
      return {
        level: 'verified',
        label: 'Verified',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400/30',
        icon: CheckCircle,
        description: 'ID verified',
        priority: 2
      }
    }
    
    if (recipient.id_verification_status === 'pending') {
      return {
        level: 'pending',
        label: 'Verifying',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-400/30',
        icon: Clock,
        description: 'Verification in progress',
        priority: 1
      }
    }
    
    return {
      level: 'unverified',
      label: 'Unverified',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-400/30',
      icon: AlertCircle,
      description: 'Profile incomplete',
      priority: 0
    }
  }

  const verificationLevel = getVerificationLevel()
  const Icon = verificationLevel.icon

  const sizes = {
    sm: {
      container: 'px-2.5 py-1.5',
      icon: 'h-3.5 w-3.5',
      text: 'text-xs',
      description: 'text-[10px]'
    },
    md: {
      container: 'px-3 py-2',
      icon: 'h-4 w-4',
      text: 'text-sm',
      description: 'text-xs'
    },
    lg: {
      container: 'px-4 py-2.5',
      icon: 'h-5 w-5',
      text: 'text-base',
      description: 'text-sm'
    }
  }

  const sizeClasses = sizes[size] || sizes.md

  return (
    <div className={`inline-flex items-center gap-2 ${verificationLevel.bgColor} ${verificationLevel.borderColor} border-2 rounded-lg ${sizeClasses.container} shadow-lg`}>
      <Icon className={`${sizeClasses.icon} ${verificationLevel.color} flex-shrink-0`} />
      <div className="flex flex-col">
        {showLevel && (
          <span className={`${sizeClasses.text} font-bold ${verificationLevel.color}`}>
            {verificationLevel.label}
          </span>
        )}
        {showDescription && (
          <span className={`${sizeClasses.description} ${verificationLevel.color.replace('400', '300')} mt-0.5`}>
            {verificationLevel.description}
          </span>
        )}
      </div>
      {verificationLevel.level === 'verified' || verificationLevel.level === 'trusted' ? (
        <Shield className={`${sizeClasses.icon} ${verificationLevel.color} flex-shrink-0`} />
      ) : null}
    </div>
  )
}

export default ProminentVerificationBadge

