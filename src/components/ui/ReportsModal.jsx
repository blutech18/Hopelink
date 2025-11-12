import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  AlertTriangle, 
  User, 
  Mail, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search,
  Filter,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Globe,
  Heart,
  Gift,
  Truck,
  Star,
  MessageSquare,
  Camera
} from 'lucide-react'
import { db } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { IDVerificationBadge } from './VerificationBadge'

const ReportsModal = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileImageModal, setShowProfileImageModal] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const { profile } = useAuth()

  useEffect(() => {
    if (isOpen) {
      loadReports()
    }
  }, [isOpen, statusFilter])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await db.getReportedUsers(statusFilter)
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleResolveReport = async (reportId, status) => {
    try {
      await db.updateReportStatus(reportId, status, profile.id, resolutionNotes)
      setSelectedReport(null)
      setResolutionNotes('')
      await loadReports()
      // Trigger a custom event to notify parent component to refresh count
      window.dispatchEvent(new CustomEvent('reportResolved'))
    } catch (error) {
      console.error('Error resolving report:', error)
      alert('Failed to update report status. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'reviewed': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'resolved': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'dismissed': return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock
      case 'reviewed': return FileText
      case 'resolved': return CheckCircle
      case 'dismissed': return XCircle
      default: return AlertTriangle
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'donor': return 'text-green-400'
      case 'recipient': return 'text-blue-400'
      case 'volunteer': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  // Helper function to calculate age from birthdate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Helper function to convert ID type value to readable label
  const getIDTypeLabel = (idType) => {
    if (!idType) return 'No ID'
    
    const idTypeMap = {
      'fourps_id': '4Ps Beneficiary ID (DSWD)',
      'philsys_id': 'Philippine National ID (PhilSys)',
      'voters_id': 'Voter\'s ID or Certificate',
      'drivers_license': 'Driver\'s License',
      'passport': 'Passport',
      'postal_id': 'Postal ID',
      'barangay_certificate': 'Barangay Certificate with photo',
      'senior_citizen_id': 'Senior Citizen ID',
      'school_id': 'School ID',
      'sss_umid': 'SSS or UMID Card',
      'prc_id': 'PRC ID',
      'sec_registration': 'SEC Registration Certificate',
      'dti_registration': 'DTI Business Registration',
      'barangay_clearance': 'Barangay Clearance or Mayor\'s Permit',
      'dswd_accreditation': 'DSWD Accreditation'
    }
    
    return idTypeMap[idType] || idType
  }

  const handleViewProfile = async (userId) => {
    if (!userId) return
    try {
      setLoadingProfile(true)
      setShowProfileModal(true)
      const userProfile = await db.getProfile(userId)
      setSelectedProfile(userProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      alert('Failed to load user profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.reported_user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reported_user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reported_by?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-[1200px] h-[800px] max-w-[95vw] max-h-[95vh] bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-yellow-500/20 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">User Reports</h2>
                <p className="text-xs text-yellow-300">Review and manage reported users</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b-2 border-yellow-500/20 flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400" />
              <input
                type="text"
                placeholder="Search by user name, email, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full sm:w-48 px-4 py-2 pr-10 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead className="bg-navy-800 border-b-2 border-yellow-500/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Reported User
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Reported By
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-yellow-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {filteredReports.map((report, idx) => {
                      return (
                        <motion.tr
                          key={report.id || `${report.reported_user_id || 'unknown'}-${report.created_at || 'na'}-${idx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-navy-800/30 transition-colors"
                        >
                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                          </td>

                          {/* Reported User */}
                          <td className="px-4 py-4 text-center">
                            <div className="min-w-0 flex flex-col items-center">
                              <button
                                onClick={() => handleViewProfile(report.reported_user?.id)}
                                className="text-sm font-semibold text-white truncate hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/30 border border-transparent"
                                title="View Profile"
                              >
                                {report.reported_user?.name || 'Unknown'}
                              </button>
                              <div className="text-xs text-gray-400 mt-0.5">
                                <span className="truncate">{report.reported_user?.email || 'N/A'}</span>
                              </div>
                              {report.reported_user?.role && (
                                <div className="text-xs mt-1">
                                  <span className={`font-medium ${getRoleColor(report.reported_user.role)}`}>
                                    {report.reported_user.role.charAt(0).toUpperCase() + report.reported_user.role.slice(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Reported By */}
                          <td className="px-4 py-4 text-center">
                            <div className="min-w-0 flex flex-col items-center">
                              <button
                                onClick={() => handleViewProfile(report.reported_by?.id)}
                                className="text-sm font-semibold text-white truncate hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/30 border border-transparent"
                                title="View Profile"
                              >
                                {report.reported_by?.name || 'Unknown'}
                              </button>
                              <div className="text-xs text-gray-400 mt-0.5">
                                <span className="truncate">{report.reported_by?.email || 'N/A'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Reason */}
                          <td className="px-4 py-4 text-center">
                            <div className="max-w-xs min-w-0 mx-auto">
                              <div className="text-sm font-medium text-white line-clamp-2">
                                {report.reason}
                              </div>
                              {report.description && (
                                <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                                  {report.description}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-xs text-gray-400">
                              <div>{new Date(report.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric'
                              })}</div>
                              <div className="text-gray-500">
                                {new Date(report.created_at).toLocaleTimeString('en-US', { 
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {report.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedReport(report)}
                                  className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 active:scale-95"
                                  title="Review Report"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleResolveReport(report.id, 'dismissed')}
                                  className="px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-400 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 active:scale-95"
                                  title="Dismiss Report"
                                >
                                  Dismiss
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 flex flex-col items-center">
                                {report.resolution_notes && (
                                  <div className="text-blue-400">
                                    <span className="truncate max-w-[150px]" title={report.resolution_notes}>
                                      Has notes
                                    </span>
                                  </div>
                                )}
                                {report.reviewed_by_user && (
                                  <div className="mt-1 text-green-400">
                                    <span className="truncate max-w-[150px]">
                                      {report.reviewed_by_user.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        {/* Resolution Modal */}
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Resolve Report</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedReport(null)
                    setResolutionNotes('')
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add resolution notes (optional)..."
                className="w-full h-32 px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4 resize-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedReport(null)
                    setResolutionNotes('')
                  }}
                  className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'reviewed')}
                  className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Mark Reviewed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfileModal && selectedProfile && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl p-3 sm:p-5 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-yellow-500/20">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                      <User className="h-4 w-4 text-yellow-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      {selectedProfile?.role === 'recipient' ? 'Requester Profile' : selectedProfile?.role === 'volunteer' ? 'Volunteer Profile' : selectedProfile?.role === 'donor' ? 'Donor Profile' : selectedProfile?.role === 'admin' ? 'Admin Profile' : 'User Profile'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-800 rounded-lg flex-shrink-0 ml-2"
                    aria-label="Close profile modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="space-y-3 sm:space-y-4">
                  {loadingProfile ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                      <p className="text-gray-400 mt-4">Loading profile...</p>
                    </div>
                  ) : (
                    <>
                      {/* Profile Header */}
                      <div className="relative flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div 
                            className="h-28 w-28 sm:h-36 sm:w-36 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors"
                            onClick={() => setShowProfileImageModal(true)}
                            title="View profile picture"
                          >
                            {selectedProfile?.profile_image_url ? (
                              <img 
                                src={selectedProfile.profile_image_url} 
                                alt={selectedProfile?.name || selectedProfile?.full_name || 'User'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-navy-700 flex items-center justify-center">
                                <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                              </div>
                            )}
                          </div>
                          {/* View Overlay - Shows on hover */}
                          <div
                            className="absolute inset-0 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none cursor-pointer"
                          >
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                          <h4 className="text-white font-bold text-base sm:text-lg mb-1">
                            {selectedProfile?.name || selectedProfile?.full_name || 'Anonymous'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              {(() => {
                                const memberDate = selectedProfile?.created_at || selectedProfile?.user_created_at || selectedProfile?.joined_at || selectedProfile?.signup_date;
                                if (memberDate) {
                                  try {
                                    const date = new Date(memberDate);
                                    if (!isNaN(date.getTime())) {
                                      return `Member since ${date.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}`;
                                    }
                                  } catch (e) {
                                    console.error('Error parsing date:', e);
                                  }
                                }
                                return 'New member';
                              })()}
                            </span>
                            {selectedProfile?.account_type && selectedProfile.account_type !== 'individual' && (
                              <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                {selectedProfile.account_type === 'business' ? 'Business' : 'Organization'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ID Verification Badge - Top Right Corner */}
                        <div className="absolute top-0 right-0 flex-shrink-0">
                          <IDVerificationBadge
                            idStatus={selectedProfile?.id_verification_status}
                            hasIdUploaded={selectedProfile?.primary_id_type && selectedProfile?.primary_id_number}
                            size="sm"
                            showText={true}
                            showDescription={false}
                          />
                        </div>
                      </div>

                      {/* Basic Information and Contact Information - 2 Column Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Basic Information */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Basic Information
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Birthdate:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.birthdate ? (
                                  new Date(selectedProfile.birthdate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                ) : (
                                  'Not provided'
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Age:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.birthdate ? (calculateAge(selectedProfile.birthdate) || 'Not available') : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Account Type:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.account_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.account_type ? (selectedProfile.account_type === 'business' ? 'Business/Organization' : 'Individual') : 'Not provided'}
                              </span>
                            </div>
                            {selectedProfile?.account_type === 'business' && (
                              <>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Organization:</span>
                                  <span className={`break-words flex-1 ${selectedProfile?.organization_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                    {selectedProfile?.organization_name || 'Not provided'}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="text-yellow-400 font-medium flex-shrink-0">Website:</span>
                                  {selectedProfile?.website_link ? (
                                    <a
                                      href={selectedProfile.website_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-yellow-300 hover:text-yellow-200 break-all flex-1 flex items-center gap-1"
                                    >
                                      <Globe className="h-3 w-3 flex-shrink-0" />
                                      {selectedProfile.website_link}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Contact Information
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                              <span className="text-white break-words flex-1">
                                {selectedProfile?.phone_number || selectedProfile?.phone ? (
                                  <a
                                    href={`tel:${selectedProfile.phone_number || selectedProfile.phone}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedProfile.phone_number || selectedProfile.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Email:</span>
                              <span className="text-white break-words flex-1">
                                {selectedProfile?.email ? (
                                  <a
                                    href={`mailto:${selectedProfile.email}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all"
                                  >
                                    {selectedProfile.email}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic">Not provided</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Address Details - Combined Location and Address */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Address Details
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Street:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.address_street ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.address_street || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Barangay:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.address_barangay ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.address_barangay || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Landmark:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.address_landmark ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.address_landmark || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">City:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.city ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.city || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Province:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.province ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.province || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">ZIP Code:</span>
                            <span className={`break-words flex-1 ${selectedProfile?.zip_code ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedProfile?.zip_code || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contact and Recipient Details - 2 Column Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Emergency Contact */}
                        {selectedProfile?.role !== 'volunteer' && (
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Emergency Contact
                            </h5>
                            <div className="space-y-2 text-xs sm:text-sm">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Name:</span>
                                <span className={`break-words flex-1 ${selectedProfile?.emergency_contact_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedProfile?.emergency_contact_name || 'Not provided'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Phone:</span>
                                {selectedProfile?.emergency_contact_phone ? (
                                  <a
                                    href={`tel:${selectedProfile.emergency_contact_phone}`}
                                    className="text-white hover:text-yellow-300 transition-colors break-all flex-1"
                                  >
                                    {selectedProfile.emergency_contact_phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 italic break-words flex-1">Not provided</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recipient-specific information */}
                        {selectedProfile?.role === 'recipient' && (
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Recipient Details
                            </h5>
                            <div className="space-y-2 text-xs sm:text-sm">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Household Size:</span>
                                <span className={`break-words flex-1 ${selectedProfile?.household_size ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedProfile?.household_size ? (
                                    `${selectedProfile.household_size} ${selectedProfile.household_size === 1 ? 'person' : 'people'}`
                                  ) : (
                                    'Not provided'
                                  )}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                                <span className={`break-words flex-1 ${selectedProfile?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedProfile?.primary_id_type ? getIDTypeLabel(selectedProfile.primary_id_type) : 'No ID'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assistance Needs - Separate Container */}
                      {selectedProfile?.role === 'recipient' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Heart className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Assistance Needs
                          </h5>
                          {selectedProfile?.assistance_needs?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedProfile.assistance_needs.map((need, i) => (
                                <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                  {need}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 italic text-xs">Not provided</p>
                          )}
                        </div>
                      )}

                      {/* Volunteer-specific information - 2x2 Grid */}
                      {selectedProfile?.role === 'volunteer' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Volunteer Details
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.primary_id_type ? getIDTypeLabel(selectedProfile.primary_id_type) : 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Experience:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.volunteer_experience ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.volunteer_experience || 'Not provided'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Insurance:</span>
                              <span className={`break-words flex-1 ${selectedProfile?.has_insurance !== undefined ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedProfile?.has_insurance !== undefined ? (selectedProfile.has_insurance ? 'Yes' : 'No') : 'Not provided'}
                              </span>
                            </div>
                            {selectedProfile?.has_insurance && (
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Insurance Provider:</span>
                                <span className={`break-words flex-1 ${selectedProfile?.insurance_provider ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedProfile?.insurance_provider || 'Not provided'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Preferred Delivery Types and Special Skills - 2 Column Layout */}
                      {selectedProfile?.role === 'volunteer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Preferred Delivery Types */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Preferred Delivery Types
                            </h5>
                            {selectedProfile?.preferred_delivery_types?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedProfile.preferred_delivery_types.map((type, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>

                          {/* Special Skills */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Special Skills
                            </h5>
                            {selectedProfile?.special_skills?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedProfile.special_skills.map((skill, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Languages Spoken and Communication Preferences - 2 Column Layout */}
                      {selectedProfile?.role === 'volunteer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Languages Spoken */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Languages Spoken
                            </h5>
                            {selectedProfile?.languages_spoken?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedProfile.languages_spoken.map((lang, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>

                          {/* Communication Preferences */}
                          <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                            <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              Communication Preferences
                            </h5>
                            {selectedProfile?.communication_preferences?.length > 0 ? (
                              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                                {selectedProfile.communication_preferences.map((pref, i) => (
                                  <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium whitespace-nowrap flex-shrink-0">
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 italic text-xs">Not provided</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Donor-specific information */}
                      {selectedProfile?.role === 'donor' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Gift className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Donation Preferences
                          </h5>
                          <div className="space-y-2 text-xs sm:text-sm">
                            <div className="min-w-0">
                              <span className="text-yellow-400 font-medium block mb-1.5 text-xs">Donation Types:</span>
                              {selectedProfile?.donation_types?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedProfile.donation_types.map((type, i) => (
                                    <span key={i} className="bg-navy-700 text-xs px-2 py-1 rounded-full text-yellow-300 border border-yellow-500/30 font-medium break-words">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400 italic text-xs">Not provided</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bio/About */}
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          About
                        </h5>
                        <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedProfile?.bio ? 'text-yellow-200' : 'text-gray-400 italic'}`}>
                          {selectedProfile?.bio || 'Not provided'}
                        </p>
                      </div>

                      {/* Delivery Notes - Separate Section */}
                      {selectedProfile?.role === 'volunteer' && (
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Delivery Notes
                          </h5>
                          <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedProfile?.delivery_notes ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedProfile?.delivery_notes || 'Not provided'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 sm:mt-4 pt-3 border-t border-yellow-500/20">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="btn btn-primary text-sm py-2 w-full"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Image Viewer Modal */}
        <AnimatePresence>
          {showProfileImageModal && selectedProfile && (
            <div className="fixed inset-0 z-[80]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfileImageModal(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              />
              
              {/* Image Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full h-full flex items-center justify-center p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedProfile?.profile_image_url ? (
                  <>
                    <img
                      src={selectedProfile.profile_image_url}
                      alt={selectedProfile?.name || selectedProfile?.full_name || 'User'}
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    />
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <div className="relative flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-navy-800 border-4 border-navy-700 flex items-center justify-center mb-4">
                      <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                    </div>
                    <p className="text-gray-400 text-sm sm:text-base">No profile picture uploaded</p>
                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowProfileImageModal(false)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors backdrop-blur-sm z-10 shadow-lg"
                      title="Close"
                      aria-label="Close image viewer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  )
}

export default ReportsModal

