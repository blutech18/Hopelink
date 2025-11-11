import React from 'react'
import MyApprovedDonationsPage from './MyApprovedDonationsPage'

// Temporary wrapper to expose a dedicated route/component for My Approved Requests
// Reuses the existing implementation to keep behavior consistent.
const MyApprovedRequestsPage = () => {
  return <MyApprovedDonationsPage />
}

export default MyApprovedRequestsPage


