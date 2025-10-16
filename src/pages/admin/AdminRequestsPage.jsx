import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  AlertTriangle, 
  Search, 
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  User,
  MapPin,
  Calendar,
  Package
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

const AdminRequestsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false)
  const [requestToUpdate, setRequestToUpdate] = useState(null)
  const [newStatus, setNewStatus] = useState(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      
      // Fetch recent donation requests with limit for better performance
      const requestsData = await db.getRequests({ limit: 100 })
      setRequests(requestsData || [])
    } catch (error) {
      console.error('Error loading requests:', error)
      setRequests([]) // Fallback to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    const requesterName = request.requester?.name || ''
    const matchesSearch = request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         requesterName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesUrgency = urgencyFilter === 'all' || request.urgency === urgencyFilter
    
    return matchesSearch && matchesStatus && matchesUrgency
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-yellow-400 bg-yellow-500/20'
      case 'fulfilled': return 'text-green-400 bg-green-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      case 'expired': return 'text-gray-400 bg-gray-500/20'
      default: return 'text-skyblue-400 bg-skyblue-500/20'
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/20'
      default: return 'text-skyblue-400 bg-skyblue-500/20'
    }
  }

  const handleViewRequest = (request) => {
    alert(`Request Details:\n\nTitle: ${request.title}\nDescription: ${request.description}\nRequester: ${request.requester?.name || 'Unknown'}\nStatus: ${request.status}\nUrgency: ${request.urgency}\nCreated: ${new Date(request.created_at).toLocaleDateString()}`)
  }

  const handleUpdateRequestStatus = async (requestId, status) => {
    setRequestToUpdate(requestId)
    setNewStatus(status)
    setShowStatusConfirmation(true)
  }

  const confirmUpdateRequestStatus = async () => {
    if (!requestToUpdate || !newStatus) return

    try {
      await db.updateRequest(requestToUpdate, { status: newStatus })
      await loadRequests()
      setShowStatusConfirmation(false)
      setRequestToUpdate(null)
      setNewStatus(null)
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Failed to update request status. Please try again.')
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Requests Management</h1>
              <p className="text-skyblue-300">Monitor and manage recipient requests</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search requests by title or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-skyblue-400 focus:outline-none focus:ring-2 focus:ring-skyblue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Urgency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Total Requests</p>
                <p className="text-2xl font-bold text-white">{requests.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Open Requests</p>
                <p className="text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'open').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">Fulfilled</p>
                <p className="text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'fulfilled').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-skyblue-300 text-sm">High Priority</p>
                <p className="text-2xl font-bold text-white">
                  {requests.filter(r => r.urgency === 'high').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Requests List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredRequests.map((request, index) => (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-navy-800/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{request.title}</div>
                        <div className="text-sm text-skyblue-400 truncate max-w-xs">
                          {request.description}
                        </div>
                        <div className="flex items-center mt-1 text-xs text-skyblue-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {request.pickup_location || request.city || 'Location not specified'}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{request.requester?.name || 'Unknown'}</div>
                        <div className="text-sm text-skyblue-400">{request.requester?.email || 'No email'}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                        {request.urgency}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-skyblue-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="p-2 text-skyblue-400 hover:text-skyblue-300 hover:bg-navy-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateRequestStatus(request.id, request.status === 'open' ? 'cancelled' : 'open')}
                          className="p-2 text-orange-400 hover:text-orange-300 hover:bg-navy-800 rounded-lg transition-colors"
                          title={request.status === 'open' ? 'Close Request' : 'Reopen Request'}
                        >
                          {request.status === 'open' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
              <p className="text-skyblue-300">No requests found</p>
              <p className="text-skyblue-400 text-sm">
                {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Requests will appear here as they are created'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStatusConfirmation}
        onClose={() => {
          setShowStatusConfirmation(false)
          setRequestToUpdate(null)
          setNewStatus(null)
        }}
        onConfirm={confirmUpdateRequestStatus}
        title={`${newStatus === 'cancelled' ? 'Close' : 'Reopen'} Request`}
        message={`Are you sure you want to ${newStatus === 'cancelled' ? 'close' : 'reopen'} this request?`}
        confirmText={`Yes, ${newStatus === 'cancelled' ? 'Close' : 'Reopen'}`}
        cancelText="Cancel"
        type="warning"
        confirmButtonVariant={newStatus === 'cancelled' ? 'danger' : 'primary'}
      />
    </div>
  )
}

export default AdminRequestsPage 