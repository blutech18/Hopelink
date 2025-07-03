import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  Shield,
  ShieldCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Check,
  X,
  Eye,
  Key
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { supabase } from '../../lib/supabase'

const UserManagementPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch users from database
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone_number,
          city,
          role,
          is_verified,
          is_active,
          created_at,
          primary_id_type,
          primary_id_number,
          primary_id_image_url,
          id_verification_status,
          secondary_id_type,
          secondary_id_number,
          secondary_id_image_url
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
        setUsers([])
      } else {
        setUsers(users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyUser = async (userId) => {
    try {
      // Update user verification status
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_verified: true } : user
      ))
    } catch (error) {
      console.error('Error verifying user:', error)
    }
  }

  const handleSuspendUser = async (userId) => {
    try {
      // Update user status
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: 'suspended' } : user
      ))
    } catch (error) {
      console.error('Error suspending user:', error)
    }
  }

  const handleApproveId = async (userId, idType) => {
    try {
      console.log('Approve ID:', userId, idType)
      
      // Update database
      const updateData = {
        is_verified: true
      }
      
      // Both primary and secondary IDs use the same verification status
      updateData.id_verification_status = 'verified'

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('Error approving ID:', error)
        return
      }

      // Update local state for immediate feedback
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              id_verification_status: 'verified',
              is_verified: true
            } 
          : user
      ))
    } catch (error) {
      console.error('Error approving ID:', error)
    }
  }

  const handleRejectId = async (userId, idType) => {
    try {
      console.log('Reject ID:', userId, idType)
      
      // Update database
      const updateData = {}
      
      // Both primary and secondary IDs use the same verification status
      updateData.id_verification_status = 'rejected'

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('Error rejecting ID:', error)
        return
      }

      // Update local state for immediate feedback
      setUsers(users.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              id_verification_status: 'rejected'
            } 
          : user
      ))
    } catch (error) {
      console.error('Error rejecting ID:', error)
    }
  }

  const handleViewUser = (userId) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
      setShowUserModal(true)
    }
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
    setActiveTab('profile')
  }

  const openImageZoom = (imageUrl, altText) => {
    setZoomedImage({ url: imageUrl, alt: altText })
  }

  const closeImageZoom = () => {
    setZoomedImage(null)
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'verified' && user.is_verified) ||
                         (statusFilter === 'unverified' && !user.is_verified) ||
                         (statusFilter === 'suspended' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleColor = (role) => {
    switch (role) {
      case 'donor': return 'text-green-400'
      case 'recipient': return 'text-blue-400'
      case 'volunteer': return 'text-purple-400'
      case 'admin': return 'text-amber-400'
      default: return 'text-skyblue-400'
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'donor': return 'bg-green-500/20 border-green-500/30'
      case 'recipient': return 'bg-blue-500/20 border-blue-500/30'
      case 'volunteer': return 'bg-purple-500/20 border-purple-500/30'
      case 'admin': return 'bg-amber-500/20 border-amber-500/30'
      default: return 'bg-skyblue-500/20 border-skyblue-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 py-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Users className="h-8 w-8 text-skyblue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-skyblue-300">Manage platform users and their permissions</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-skyblue-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-skyblue-400 focus:outline-none focus:ring-2 focus:ring-skyblue-500"
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Roles</option>
              <option value="donor">Donors</option>
              <option value="recipient">Recipients</option>
              <option value="volunteer">Volunteers</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-skyblue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <div className="text-skyblue-300 text-sm">Total Users</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-green-400">{users.filter(u => u.is_verified).length}</div>
              <div className="text-skyblue-300 text-sm">Verified</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-yellow-400">{users.filter(u => !u.is_verified).length}</div>
              <div className="text-skyblue-300 text-sm">Unverified</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-red-400">{users.filter(u => !u.is_active).length}</div>
              <div className="text-skyblue-300 text-sm">Suspended</div>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card overflow-hidden"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    ID Verification
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-skyblue-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-navy-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-skyblue-600 flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-sm text-skyblue-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        <span className={getRoleColor(user.role)}>{user.role}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-skyblue-300">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                                                        {user.phone_number}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {user.city}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center">
                          {user.is_verified ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                              <span className="text-green-400 text-xs">Verified</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-yellow-400 mr-1" />
                              <span className="text-yellow-400 text-xs">Unverified</span>
                            </>
                          )}
                        </div>
                        {!user.is_active && (
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 text-red-400 mr-1" />
                            <span className="text-red-400 text-xs">Suspended</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {user.role !== 'admin' && (
                          <>
                            {user.primary_id_type ? (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-3 w-3 text-skyblue-400" />
                                <span className="text-xs text-skyblue-300">{user.primary_id_type}</span>
                                {user.id_verification_status === 'verified' ? (
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                ) : user.id_verification_status === 'rejected' ? (
                                  <XCircle className="h-3 w-3 text-red-400" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No ID submitted</span>
                            )}
                            {user.secondary_id_type && (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-3 w-3 text-skyblue-400" />
                                <span className="text-xs text-skyblue-300">{user.secondary_id_type}</span>
                                {user.id_verification_status === 'verified' ? (
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                ) : user.id_verification_status === 'rejected' ? (
                                  <XCircle className="h-3 w-3 text-red-400" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {user.role === 'admin' && (
                          <span className="text-xs text-green-400">Auto-verified</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-skyblue-300">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {user.role !== 'admin' && user.primary_id_type && user.id_verification_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveId(user.id, 'primary')}
                              className="text-green-400 hover:text-green-300 p-1"
                              title="Approve Primary ID"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectId(user.id, 'primary')}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Reject Primary ID"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="text-skyblue-400 hover:text-skyblue-300 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-skyblue-400 mx-auto mb-4" />
              <p className="text-skyblue-300">No users found matching your criteria</p>
            </div>
          )}
        </motion.div>

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeUserModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-navy-800 px-6 py-4 border-b border-navy-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-skyblue-600 flex items-center justify-center text-white font-medium text-lg">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                      <p className="text-skyblue-400">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeUserModal}
                    className="text-skyblue-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="px-6 py-0 border-b border-navy-700">
                <div className="flex space-x-0">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'profile'
                        ? 'border-skyblue-400 text-skyblue-400'
                        : 'border-transparent text-skyblue-300 hover:text-white'
                    }`}
                  >
                    Profile Information
                  </button>
                  <button
                    onClick={() => setActiveTab('verification')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'verification'
                        ? 'border-skyblue-400 text-skyblue-400'
                        : 'border-transparent text-skyblue-300 hover:text-white'
                    }`}
                  >
                    ID Verification
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'actions'
                        ? 'border-skyblue-400 text-skyblue-400'
                        : 'border-transparent text-skyblue-300 hover:text-white'
                    }`}
                  >
                    Admin Actions
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 custom-scrollbar overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Profile Information Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-6">User Profile Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-navy-800 rounded-lg p-4">
                          <h4 className="text-md font-medium text-white mb-3">Basic Information</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm text-skyblue-300">Full Name</label>
                              <p className="text-white font-medium">{selectedUser.name}</p>
                            </div>
                            <div>
                              <label className="text-sm text-skyblue-300">Email Address</label>
                              <p className="text-white">{selectedUser.email}</p>
                            </div>
                            <div>
                              <label className="text-sm text-skyblue-300">Phone Number</label>
                              <p className="text-white">{selectedUser.phone_number}</p>
                            </div>
                            <div>
                              <label className="text-sm text-skyblue-300">City</label>
                              <p className="text-white">{selectedUser.city}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-navy-800 rounded-lg p-4">
                          <h4 className="text-md font-medium text-white mb-3">Account Details</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm text-skyblue-300">Role</label>
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(selectedUser.role)} mt-1`}>
                                <span className={getRoleColor(selectedUser.role)}>{selectedUser.role}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm text-skyblue-300">Account Status</label>
                              <div className="flex items-center space-x-2 mt-1">
                                {selectedUser.is_verified ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    <span className="text-green-400">Verified</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                    <span className="text-yellow-400">Unverified</span>
                                  </>
                                )}
                                {!selectedUser.is_active && (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-400 ml-2" />
                                    <span className="text-red-400">Suspended</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm text-skyblue-300">Member Since</label>
                              <p className="text-white">{new Date(selectedUser.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ID Verification Tab */}
                {activeTab === 'verification' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Identity Verification</h3>

                    {selectedUser.role === 'admin' ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-green-400 mb-2">Administrator Account</h4>
                        <p className="text-skyblue-300">Admin accounts are automatically verified and don't require ID verification</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Primary ID */}
                        <div className="bg-navy-800 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-white">Primary Identification</h4>
                            <div className="flex items-center space-x-2">
                              {selectedUser.id_verification_status === 'verified' ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-green-400" />
                                  <span className="text-green-400 font-medium">Verified</span>
                                </>
                              ) : selectedUser.id_verification_status === 'rejected' ? (
                                <>
                                  <XCircle className="h-5 w-5 text-red-400" />
                                  <span className="text-red-400 font-medium">Rejected</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                  <span className="text-yellow-400 font-medium">Pending Review</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {selectedUser.primary_id_type ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm text-skyblue-300 font-medium">Document Type</label>
                                    <p className="text-white text-lg">{selectedUser.primary_id_type}</p>
                                  </div>
                                  {selectedUser.primary_id_number && (
                                    <div>
                                      <label className="text-sm text-skyblue-300 font-medium">ID Number</label>
                                      <p className="text-white font-mono text-lg">{selectedUser.primary_id_number}</p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {selectedUser.primary_id_image_url ? (
                                    <div>
                                      <label className="text-sm text-skyblue-300 font-medium">Document Image</label>
                                      <div className="mt-2">
                                        <img 
                                          src={selectedUser.primary_id_image_url} 
                                          alt="Primary ID"
                                          className="w-full h-40 object-cover bg-navy-700 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity shadow-lg"
                                          onClick={() => openImageZoom(selectedUser.primary_id_image_url, 'Primary ID Document')}
                                        />
                                        <p className="text-xs text-skyblue-400 mt-2 text-center">📄 Click to view full size</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                      <p className="text-gray-400">No document uploaded</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedUser.id_verification_status === 'pending' && (
                                <div className="flex space-x-2 pt-2">
                                  <button
                                    onClick={() => {
                                      handleApproveId(selectedUser.id, 'primary')
                                      setSelectedUser({...selectedUser, id_verification_status: 'verified', is_verified: true})
                                    }}
                                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                                  >
                                    <Check className="h-4 w-4" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleRejectId(selectedUser.id, 'primary')
                                      setSelectedUser({...selectedUser, id_verification_status: 'rejected'})
                                    }}
                                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-400 text-lg">No primary ID submitted</p>
                              <p className="text-gray-500 text-sm">User has not uploaded their primary identification</p>
                            </div>
                          )}
                        </div>

                        {/* Secondary ID */}
                        {selectedUser.secondary_id_type && (
                          <div className="bg-navy-800 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-medium text-white">Secondary Identification</h4>
                              <div className="flex items-center space-x-2">
                                {selectedUser.id_verification_status === 'verified' ? (
                                  <>
                                    <CheckCircle className="h-5 w-5 text-green-400" />
                                    <span className="text-green-400 font-medium">Verified</span>
                                  </>
                                ) : selectedUser.id_verification_status === 'rejected' ? (
                                  <>
                                    <XCircle className="h-5 w-5 text-red-400" />
                                    <span className="text-red-400 font-medium">Rejected</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                    <span className="text-yellow-400 font-medium">Pending Review</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm text-skyblue-300 font-medium">Document Type</label>
                                    <p className="text-white text-lg">{selectedUser.secondary_id_type}</p>
                                  </div>
                                  {selectedUser.secondary_id_number && (
                                    <div>
                                      <label className="text-sm text-skyblue-300 font-medium">ID Number</label>
                                      <p className="text-white font-mono text-lg">{selectedUser.secondary_id_number}</p>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {selectedUser.secondary_id_image_url ? (
                                    <div>
                                      <label className="text-sm text-skyblue-300 font-medium">Document Image</label>
                                      <div className="mt-2">
                                        <img 
                                          src={selectedUser.secondary_id_image_url} 
                                          alt="Secondary ID"
                                          className="w-full h-40 object-cover bg-navy-700 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity shadow-lg"
                                          onClick={() => openImageZoom(selectedUser.secondary_id_image_url, 'Secondary ID Document')}
                                        />
                                        <p className="text-xs text-skyblue-400 mt-2 text-center">📄 Click to view full size</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                      <p className="text-gray-400">No document uploaded</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedUser.id_verification_status === 'pending' && (
                                <div className="flex space-x-2 pt-2">
                                  <button
                                    onClick={() => {
                                      handleApproveId(selectedUser.id, 'secondary')
                                      setSelectedUser({...selectedUser, id_verification_status: 'verified', is_verified: true})
                                    }}
                                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                                  >
                                    <Check className="h-4 w-4" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleRejectId(selectedUser.id, 'secondary')
                                      setSelectedUser({...selectedUser, id_verification_status: 'rejected'})
                                    }}
                                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Administrative Actions Tab */}
                {activeTab === 'actions' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Administrative Actions</h3>
                    
                    {/* Verification Actions */}
                    <div className="bg-navy-800 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-white mb-4">ID Verification Actions</h4>
                      {selectedUser.role !== 'admin' && selectedUser.id_verification_status === 'pending' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <AlertTriangle className="h-6 w-6 text-yellow-400" />
                            <span className="text-yellow-400 font-medium text-lg">Pending Review Required</span>
                          </div>
                          <p className="text-skyblue-300 mb-6">This user's identification documents require your review and approval.</p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                handleApproveId(selectedUser.id, 'primary')
                                setSelectedUser({...selectedUser, id_verification_status: 'verified', is_verified: true})
                              }}
                              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <Check className="h-5 w-5" />
                              <span>Approve Verification</span>
                            </button>
                            <button
                              onClick={() => {
                                handleRejectId(selectedUser.id, 'primary')
                                setSelectedUser({...selectedUser, id_verification_status: 'rejected'})
                              }}
                              className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <X className="h-5 w-5" />
                              <span>Reject Verification</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedUser.role !== 'admin' && selectedUser.id_verification_status === 'verified' && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-6 w-6 text-green-400" />
                            <span className="text-green-400 font-medium text-lg">Verification Complete</span>
                          </div>
                          <p className="text-skyblue-300 mt-2">User has been successfully verified and approved</p>
                        </div>
                      )}

                      {selectedUser.role !== 'admin' && selectedUser.id_verification_status === 'rejected' && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-6 w-6 text-red-400" />
                            <span className="text-red-400 font-medium text-lg">Verification Rejected</span>
                          </div>
                          <p className="text-skyblue-300 mt-2">ID verification was rejected - user may need to resubmit documents</p>
                        </div>
                      )}

                      {selectedUser.role === 'admin' && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-6 w-6 text-blue-400" />
                            <span className="text-blue-400 font-medium text-lg">Administrator Account</span>
                          </div>
                          <p className="text-skyblue-300 mt-2">No verification actions required for admin accounts</p>
                        </div>
                      )}
                    </div>

                    {/* Account Management */}
                    <div className="bg-navy-800 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-white mb-4">Account Management</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button className="flex items-center space-x-2 px-4 py-3 text-skyblue-400 hover:bg-navy-700 rounded-lg transition-colors">
                          <Key className="h-4 w-4" />
                          <span>Reset Password</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-3 text-skyblue-400 hover:bg-navy-700 rounded-lg transition-colors">
                          <Mail className="h-4 w-4" />
                          <span>Send Notification</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-3 text-red-400 hover:bg-navy-700 rounded-lg transition-colors">
                          <XCircle className="h-4 w-4" />
                          <span>{selectedUser.is_active ? 'Suspend Account' : 'Activate Account'}</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-3 text-skyblue-400 hover:bg-navy-700 rounded-lg transition-colors">
                          <Eye className="h-4 w-4" />
                          <span>View Activity Log</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
            onClick={closeImageZoom}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-4xl max-h-[90vh] bg-navy-900 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 bg-navy-800 border-b border-navy-700">
                <h3 className="text-lg font-semibold text-white">{zoomedImage.alt}</h3>
                <button
                  onClick={closeImageZoom}
                  className="text-skyblue-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <img 
                  src={zoomedImage.url} 
                  alt={zoomedImage.alt}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserManagementPage 