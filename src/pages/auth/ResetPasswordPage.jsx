import React from 'react'
import { Link } from 'react-router-dom'

const ResetPasswordPage = () => {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/hopelinklogo.png" alt="HopeLink" className="h-12 w-12 rounded" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-skyblue-300">
          Password reset functionality coming soon
        </p>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-skyblue-400 hover:text-skyblue-300">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage 