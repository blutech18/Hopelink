import React from 'react'
import { useAuth } from '../../contexts/AuthContext'

const RoleDebugger = () => {
  const { user, profile, isDonor, isRecipient, isVolunteer, isAdmin } = useAuth()
  
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-navy-800 border border-navy-700 rounded-lg p-4 text-xs max-w-sm z-50">
      <h3 className="text-white font-semibold mb-2">Debug: Auth Info</h3>
      <div className="space-y-1 text-skyblue-300">
        <div>User ID: {user?.id?.slice(0, 8) || 'None'}</div>
        <div>Email: {user?.email || 'None'}</div>
        <div>Profile Role: {profile?.role || 'None'}</div>
        <div>User Metadata Role: {user?.user_metadata?.role || 'None'}</div>
        <div className="text-yellow-400">Role Checks:</div>
        <div>isDonor: {isDonor ? '✓' : '✗'}</div>
        <div>isRecipient: {isRecipient ? '✓' : '✗'}</div>
        <div>isVolunteer: {isVolunteer ? '✓' : '✗'}</div>
        <div>isAdmin: {isAdmin ? '✓' : '✗'}</div>
      </div>
    </div>
  )
}

export default RoleDebugger 