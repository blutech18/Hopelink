import React, { useState } from 'react'
import { Info, X } from 'lucide-react'
import WorkflowTutorial from './WorkflowTutorial'
import { useAuth } from '../../contexts/AuthContext'

const SeeHowItWorksButton = ({ variant = 'default', size = 'md', className = '' }) => {
  const { profile } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)

  const variants = {
    default: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-400/30',
    primary: 'bg-yellow-500 hover:bg-yellow-600 text-navy-950 border-yellow-500',
    outline: 'bg-transparent hover:bg-yellow-500/10 text-yellow-400 border-yellow-400/50',
    ghost: 'bg-transparent hover:bg-yellow-500/10 text-yellow-400 border-transparent'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const userRole = profile?.role || 'donor'

  return (
    <>
      <button
        onClick={() => setShowTutorial(true)}
        className={`flex items-center gap-2 rounded-lg border transition-all font-medium ${variants[variant]} ${sizes[size]} ${className}`}
      >
        <Info className="h-4 w-4" />
        <span>See How It Works</span>
      </button>

      <WorkflowTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        userRole={userRole}
      />
    </>
  )
}

export default SeeHowItWorksButton

