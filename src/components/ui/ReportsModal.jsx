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
  Filter
} from 'lucide-react'
import { db } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const ReportsModal = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
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
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-navy-900 rounded-lg border border-navy-700 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-navy-800 border-b border-navy-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">User Reports</h2>
                <p className="text-sm text-gray-400">Review and manage reported users</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-navy-700 flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400" />
              <input
                type="text"
                placeholder="Search by user name, email, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full sm:w-48 px-4 py-2 pr-10 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer"
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
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const StatusIcon = getStatusIcon(report.status)
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-navy-800 border border-navy-700 rounded-lg p-4 hover:border-yellow-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            {/* Reported User */}
                            <div className="bg-navy-900 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-red-400" />
                                <span className="text-xs font-semibold text-gray-400">Reported User</span>
                              </div>
                              <div className="text-sm font-medium text-white">{report.reported_user?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                {report.reported_user?.email || 'N/A'}
                              </div>
                              <div className="text-xs mt-1">
                                <span className={`font-medium ${getRoleColor(report.reported_user?.role)}`}>
                                  {report.reported_user?.role?.charAt(0).toUpperCase() + report.reported_user?.role?.slice(1) || 'Unknown'}
                                </span>
                              </div>
                            </div>

                            {/* Reported By */}
                            <div className="bg-navy-900 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-yellow-400" />
                                <span className="text-xs font-semibold text-gray-400">Reported By</span>
                              </div>
                              <div className="text-sm font-medium text-white">{report.reported_by?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                {report.reported_by?.email || 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-gray-400 mb-1">Reason</div>
                            <div className="text-sm text-white bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                              {report.reason}
                            </div>
                          </div>

                          {/* Description */}
                          {report.description && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-400 mb-1">Description</div>
                              <div className="text-sm text-gray-300 bg-navy-900 rounded-lg px-3 py-2">
                                {report.description}
                              </div>
                            </div>
                          )}

                          {/* Resolution Notes */}
                          {report.resolution_notes && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-400 mb-1">Resolution Notes</div>
                              <div className="text-sm text-gray-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                                {report.resolution_notes}
                              </div>
                            </div>
                          )}

                          {/* Reviewed By */}
                          {report.reviewed_by_user && (
                            <div className="text-xs text-gray-400 mb-3">
                              Reviewed by: {report.reviewed_by_user.name} on {new Date(report.reviewed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {report.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-4 border-t border-navy-700">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                            className="flex-1 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Resolution Modal */}
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-navy-900 border border-navy-700 rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">Resolve Report</h3>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add resolution notes (optional)..."
                className="w-full h-32 px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedReport(null)
                    setResolutionNotes('')
                  }}
                  className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'resolved')}
                  className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleResolveReport(selectedReport.id, 'reviewed')}
                  className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Mark Reviewed
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  )
}

export default ReportsModal

