import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical,
  Shield,
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
  Download,
  Printer,
  Flag,
  Ban,
  Unlock
} from 'lucide-react'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { supabase, db } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import ReportsModal from '../../components/ui/ReportsModal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const UserManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [reportCount, setReportCount] = useState(0)
  const [suspendConfirm, setSuspendConfirm] = useState(null)
  const [activateConfirm, setActivateConfirm] = useState(null)
  const { profile } = useAuth()
  const { success, error: showError } = useToast()

  useEffect(() => {
    loadUsers()
    loadReportCount()
    
    // Check if we should open reports modal from query parameter
    if (searchParams.get('openReports') === 'true') {
      setShowReportsModal(true)
      // Remove the query parameter from URL
      searchParams.delete('openReports')
      setSearchParams(searchParams, { replace: true })
    }

    // Refresh report count every 30 seconds
    const interval = setInterval(() => {
      loadReportCount()
    }, 30000)

    // Listen for report resolved events
    const handleReportResolved = () => {
      loadReportCount()
    }
    window.addEventListener('reportResolved', handleReportResolved)

    return () => {
      clearInterval(interval)
      window.removeEventListener('reportResolved', handleReportResolved)
    }
  }, [])

  const loadReportCount = async () => {
    try {
      const count = await db.getReportCount('pending')
      setReportCount(count || 0)
    } catch (error) {
      console.error('Error loading report count:', error)
      setReportCount(0)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Fetch users from database with limit for better performance
      // Join with user_profiles to get id_documents JSONB
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
          profile_image_url,
          profile:user_profiles(id_documents)
        `)
        .order('created_at', { ascending: false })
        .limit(100) // Limit to 100 most recent users for better performance

      if (error) {
        console.error('Error loading users:', error)
        setUsers([])
      } else {
        // Flatten ID document fields from joined profile JSONB
        const flattenedUsers = (users || []).map(user => {
          const idDocuments = user.profile?.id_documents || null
          return {
            ...user,
            primary_id_type: idDocuments?.primary_id_type || null,
            primary_id_number: idDocuments?.primary_id_number || null,
            primary_id_image_url: idDocuments?.primary_id_image_url || null,
            secondary_id_type: idDocuments?.secondary_id_type || null,
            secondary_id_number: idDocuments?.secondary_id_number || null,
            secondary_id_image_url: idDocuments?.secondary_id_image_url || null,
            // Map verification_status from id_documents to id_verification_status for backward compatibility
            id_verification_status: idDocuments?.verification_status || null
          }
        })
        setUsers(flattenedUsers)
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

  const handleSuspendUser = async (userId, userName) => {
    try {
      // Update user is_active status to false (suspended)
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (updateError) {
        console.error('Error suspending user:', updateError)
        showError('Failed to suspend user. Please try again.')
        return
      }

      // Update local state for immediate feedback
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: false } : user
      ))

      success(`User ${userName || 'has been'} suspended successfully.`)
      setSuspendConfirm(null)

      // Reload users to ensure consistency
      await loadUsers()
    } catch (err) {
      console.error('Error suspending user:', err)
      showError('Failed to suspend user. Please try again.')
      setSuspendConfirm(null)
    }
  }

  const handleActivateUser = async (userId, userName) => {
    try {
      // Update user is_active status to true (activated)
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', userId)

      if (updateError) {
        console.error('Error activating user:', updateError)
        showError('Failed to activate user. Please try again.')
        return
      }

      // Update local state for immediate feedback
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: true } : user
      ))

      success(`User ${userName || 'has been'} activated successfully.`)
      setActivateConfirm(null)

      // Reload users to ensure consistency
      await loadUsers()
    } catch (err) {
      console.error('Error activating user:', err)
      showError('Failed to activate user. Please try again.')
      setActivateConfirm(null)
    }
  }

  const handleApproveId = async (userId, idType) => {
    try {
      console.log('Approve ID:', userId, idType)
      
      // Update user verification status
      const { error: userError } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId)

      if (userError) {
        console.error('Error updating user verification:', userError)
      }

      // Update ID document verification status in user_profiles.id_documents JSONB
      // 1) Fetch existing id_documents
      const { data: profile, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('id, id_documents')
        .eq('user_id', userId)
        .single()

      if (fetchErr) {
        console.error('Error fetching user profile:', fetchErr)
      } else {
        const updatedIdDocs = { ...(profile?.id_documents || {}), verification_status: 'verified' }
        const { error: idDocError } = await supabase
          .from('user_profiles')
          .update({ id_documents: updatedIdDocs })
          .eq('id', profile.id)
        if (idDocError) {
          console.error('Error approving ID:', idDocError)
          return
        }
      }

      if (idDocError) {
        console.error('Error approving ID:', idDocError)
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
      
      // Update ID document verification status in user_profiles.id_documents JSONB
      const { data: profile, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('id, id_documents')
        .eq('user_id', userId)
        .single()

      if (fetchErr) {
        console.error('Error fetching user profile:', fetchErr)
        return
      }

      const updatedIdDocs = { ...(profile?.id_documents || {}), verification_status: 'rejected' }
      const { error } = await supabase
        .from('user_profiles')
        .update({ id_documents: updatedIdDocs })
        .eq('id', profile.id)

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
      default: return 'text-yellow-400'
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'donor': return 'bg-green-500/20 border-green-500/30'
      case 'recipient': return 'bg-blue-500/20 border-blue-500/30'
      case 'volunteer': return 'bg-purple-500/20 border-purple-500/30'
      case 'admin': return 'bg-amber-500/20 border-amber-500/30'
      default: return 'bg-yellow-500/20 border-yellow-500/30'
    }
  }

  // PDF and Print functions
  const generatePDF = async () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      alert('No users available to export')
      return
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      
      // System colors
      const primaryColor = [0, 26, 92] // #001a5c
      const secondaryColor = [0, 35, 125] // #00237d
      
      // Header function
      const addHeader = (pageNum, totalPages) => {
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, pageWidth, 40, 'F')
        
        doc.setFillColor(...secondaryColor)
        doc.rect(0, 38, pageWidth, 2, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('HopeLink', margin + 5, 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(205, 215, 74)
        doc.text('CFC-GK Community Platform', margin + 5, 28)
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        const title = 'User Management Report'
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Users List', pageWidth - margin - doc.getTextWidth('Users List'), 28)
        
        doc.setTextColor(0, 0, 0)
      }
      
      // Footer function
      const addFooter = (pageNum, totalPages) => {
        const footerY = pageHeight - 15
        
        doc.setFillColor(245, 245, 245)
        doc.rect(0, footerY - 8, pageWidth, 15, 'F')
        
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8)
        
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'normal')
        const genDate = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        doc.text(`Generated: ${genDate}`, margin, footerY)
        
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 26, 92)
        const pageText = `Page ${pageNum} of ${totalPages}`
        doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), footerY)
        
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'italic')
        const confidentialText = 'HopeLink - Confidential Report'
        doc.text(confidentialText, pageWidth / 2 - doc.getTextWidth(confidentialText) / 2, footerY + 5)
      }
      
      // Prepare table data
      const tableData = filteredUsers.map(user => [
        user.name || '',
        user.email || '',
        user.role || '',
        user.phone_number || 'N/A',
        user.city || 'N/A',
        user.is_verified ? 'Verified' : 'Unverified',
        user.is_active ? 'Active' : 'Suspended',
        user.id_verification_status || 'N/A',
        new Date(user.created_at).toLocaleDateString()
      ])
      
      const columns = ['Name', 'Email', 'Role', 'Phone', 'City', 'Status', 'Account', 'ID Verification', 'Joined']
      
      // Add summary info
      let currentY = 50
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Users: ${filteredUsers.length}`, margin, currentY)
      doc.text(`Verified: ${filteredUsers.filter(u => u.is_verified).length} | Unverified: ${filteredUsers.filter(u => !u.is_verified).length}`, margin + 60, currentY)
      
      currentY += 8
      
      // Add table
      autoTable(doc, {
        startY: currentY,
        head: [columns],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40]
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        styles: {
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
          lineWidth: 0.1,
          lineColor: [220, 220, 220],
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        margin: { top: currentY, left: margin, right: margin, bottom: 20 },
        didDrawPage: (data) => {
          const pageNumber = data.pageNumber
          addHeader(pageNumber, pageNumber)
        }
      })
      
      // Get final page count and redraw headers/footers
      const totalPages = doc.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addHeader(i, totalPages)
        addFooter(i, totalPages)
      }
      
      doc.save(`users_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      alert('No users available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    const tableRows = filteredUsers.map(user => {
      return `
        <tr>
          <td>${user.name || ''}</td>
          <td>${user.email || ''}</td>
          <td>${user.role || ''}</td>
          <td>${user.phone_number || 'N/A'}</td>
          <td>${user.city || 'N/A'}</td>
          <td>${user.is_verified ? 'Verified' : 'Unverified'}</td>
          <td>${user.is_active ? 'Active' : 'Suspended'}</td>
          <td>${user.id_verification_status || 'N/A'}</td>
          <td>${new Date(user.created_at).toLocaleDateString()}</td>
        </tr>
      `
    }).join('')
    
    const genDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>User Management Report - HopeLink</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif; 
              padding: 0;
              color: #333;
              background: white;
            }
            .header {
              background: linear-gradient(135deg, #001a5c 0%, #00237d 100%);
              color: white;
              padding: 20px 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #cdd74a;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo-container {
              width: 50px;
              height: 50px;
              background: white;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-container img {
              max-width: 45px;
              max-height: 45px;
            }
            .brand-info h1 {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .brand-info p {
              font-size: 12px;
              color: #cdd74a;
            }
            .header-right {
              text-align: right;
            }
            .header-right h2 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header-right p {
              font-size: 11px;
              color: #e0e0e0;
              font-style: italic;
            }
            .content {
              padding: 30px;
            }
            .summary {
              background: #f8f9fa;
              padding: 15px 20px;
              border-left: 4px solid #001a5c;
              margin-bottom: 25px;
              border-radius: 4px;
            }
            .summary p {
              font-size: 14px;
              color: #555;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 11px;
            }
            thead {
              background: #001a5c;
              color: white;
            }
            th { 
              padding: 10px 8px; 
              text-align: left; 
              font-weight: bold;
              font-size: 11px;
            }
            td { 
              padding: 8px; 
              border-bottom: 1px solid #e0e0e0;
              font-size: 10px;
            }
            tr:nth-child(even) { 
              background-color: #f8f9fa; 
            }
            .footer {
              background: #f5f5f5;
              padding: 15px 30px;
              border-top: 2px solid #ddd;
              margin-top: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #666;
            }
            .footer-center {
              text-align: center;
              font-style: italic;
              color: #888;
            }
            .footer-right {
              font-weight: bold;
              color: #001a5c;
            }
            @media print {
              body { padding: 0; }
              .header { page-break-after: avoid; }
              .footer { page-break-before: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              @page { 
                margin: 1.5cm;
                size: A4 landscape;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="logo-container">
                <img src="/hopelinklogo.png" alt="HopeLink Logo" onerror="this.style.display='none'">
              </div>
              <div class="brand-info">
                <h1>HopeLink</h1>
                <p>CFC-GK Community Platform</p>
              </div>
            </div>
            <div class="header-right">
              <h2>User Management Report</h2>
              <p>Users List</p>
            </div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Users:</strong> ${filteredUsers.length} | <strong>Verified:</strong> ${filteredUsers.filter(u => u.is_verified).length} | <strong>Unverified:</strong> ${filteredUsers.filter(u => !u.is_verified).length} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th>ID Verification</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div>© ${new Date().getFullYear()} HopeLink CFC-GK. All rights reserved.</div>
            <div class="footer-center">HopeLink - Confidential Report</div>
            <div class="footer-right">Generated: ${genDate}</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 custom-scrollbar" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">User Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Manage platform users and their permissions</p>
            </div>
            {filteredUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      generatePDF().catch(err => {
                        console.error('PDF generation error:', err)
                        alert('Failed to generate PDF. Please try again.')
                      })
                    } catch (error) {
                      console.error('PDF generation error:', error)
                      alert('Failed to generate PDF. Please try again.')
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  title="Download PDF"
                  type="button"
                  aria-label="Download PDF"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handlePrint()
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  title="Print"
                  type="button"
                  aria-label="Print"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowReportsModal(true)
                    loadReportCount()
                  }}
                  className="relative flex items-center justify-center p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-red-400 hover:text-red-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                  title="User Reports"
                  type="button"
                  aria-label="User Reports"
                >
                  <Flag className="h-5 w-5" />
                  {reportCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center border-2 border-navy-900 shadow-lg">
                      {reportCount > 99 ? '99+' : reportCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 px-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
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
                className="flex-1 px-4 py-3 sm:py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl font-bold text-white">{users.length}</div>
                  <div className="text-yellow-300 text-xs sm:text-sm">Total Users</div>
                </div>
              </div>
            </div>
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{users.filter(u => u.is_verified).length}</div>
                  <div className="text-yellow-300 text-xs sm:text-sm">Verified</div>
                </div>
              </div>
            </div>
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400">{users.filter(u => !u.is_verified).length}</div>
                  <div className="text-yellow-300 text-xs sm:text-sm">Unverified</div>
                </div>
              </div>
            </div>
            <div className="card p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                <div className="flex flex-col">
                  <div className="text-xl sm:text-2xl font-bold text-red-400">{users.filter(u => !u.is_active).length}</div>
                  <div className="text-yellow-300 text-xs sm:text-sm">Suspended</div>
                </div>
              </div>
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
            <div className="min-w-[800px]">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    ID Verification
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
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
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={user.name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-yellow-500/30 flex-shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-10 w-10 rounded-full bg-yellow-600 flex items-center justify-center text-white font-medium flex-shrink-0 ${user.profile_image_url ? 'hidden' : ''}`}
                        >
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-sm text-yellow-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        <span className={getRoleColor(user.role)}>{user.role}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-300 text-center">
                      <div className="inline-flex flex-col space-y-1">
                        <div className="flex items-center justify-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {user.phone_number}
                        </div>
                        <div className="flex items-center justify-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {user.city}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex flex-col space-y-1">
                        <div className="flex items-center justify-center">
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
                          <div className="flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-400 mr-1" />
                            <span className="text-red-400 text-xs">Suspended</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex flex-col space-y-1">
                        {user.role !== 'admin' && (
                          <>
                            {user.primary_id_type ? (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs text-yellow-300">{user.primary_id_type}</span>
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
                                <FileText className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs text-yellow-300">{user.secondary_id_type}</span>
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
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-300 text-center">
                      <div className="">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium">View Details</span>
                        </button>
                        
                        {user.role !== 'admin' && (
                          <>
                            {user.is_active ? (
                              <button
                                onClick={() => setSuspendConfirm({ id: user.id, name: user.name })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                                title="Suspend User"
                              >
                                <Ban className="h-4 w-4" />
                                <span className="text-xs font-medium">Suspend</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setActivateConfirm({ id: user.id, name: user.name })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-green-400 hover:text-green-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                                title="Activate User"
                              >
                                <Unlock className="h-4 w-4" />
                                <span className="text-xs font-medium">Activate</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No users found matching your criteria</p>
            </div>
          )}
        </motion.div>

        {/* User Details Modal */}
        {showUserModal && selectedUser && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={closeUserModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-navy-900 border-2 border-yellow-500/30 shadow-2xl rounded-lg sm:rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-yellow-500/20 flex-shrink-0 gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">User Details</h3>
                    <p className="text-[10px] sm:text-xs text-yellow-300">Complete information</p>
                  </div>
                </div>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-navy-800 rounded-lg flex-shrink-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Content with Custom Scrollbar */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                <div className="space-y-6">
                  {/* User Profile Header */}
                  <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        {selectedUser.profile_image_url ? (
                          <img 
                            src={selectedUser.profile_image_url} 
                            alt={selectedUser.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500/30 shadow-lg flex-shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0 ${selectedUser.profile_image_url ? 'hidden' : ''}`}
                        >
                          {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-white">{selectedUser.name}</h4>
                          <p className="text-sm text-gray-400">{selectedUser.email}</p>
                        </div>
                      </div>
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(selectedUser.role)}`}>
                        <span className={getRoleColor(selectedUser.role)}>{selectedUser.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        <label className="text-sm font-semibold text-yellow-300">Full Name</label>
                      </div>
                      <p className="text-white text-lg font-medium">{selectedUser.name}</p>
                    </div>
                    
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-green-400" />
                        <label className="text-sm font-semibold text-yellow-300">Email Address</label>
                      </div>
                      <p className="text-white text-lg font-medium">{selectedUser.email}</p>
                    </div>
                    
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-green-400" />
                        <label className="text-sm font-semibold text-yellow-300">Phone Number</label>
                      </div>
                      <p className="text-white text-lg font-medium">{selectedUser.phone_number || 'Not provided'}</p>
                    </div>
                    
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-green-400" />
                        <label className="text-sm font-semibold text-yellow-300">Location</label>
                      </div>
                      <p className="text-white text-lg font-medium">{selectedUser.city || 'Not specified'}{selectedUser.province ? `, ${selectedUser.province}` : ''}</p>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-green-400" />
                        <label className="text-sm font-semibold text-yellow-300">Account Status</label>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedUser.is_verified ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-white text-lg font-medium">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            <span className="text-white text-lg font-medium">Unverified</span>
                          </div>
                        )}
                        {!selectedUser.is_active && (
                          <div className="flex items-center gap-1.5 ml-3">
                            <XCircle className="h-4 w-4 text-red-400" />
                            <span className="text-white text-lg font-medium">Suspended</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <label className="text-sm font-semibold text-yellow-300">Member Since</label>
                      </div>
                      <p className="text-white text-lg font-medium">{new Date(selectedUser.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                  </div>

                  {/* Last Login */}
                  {selectedUser.last_login && (
                    <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-orange-400" />
                        <label className="text-sm font-semibold text-yellow-300">Last Login</label>
                      </div>
                      <p className="text-white">{new Date(selectedUser.last_login).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t-2 border-yellow-500/20 flex justify-end flex-shrink-0">
                <button
                  onClick={closeUserModal}
                  className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={closeImageZoom}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-navy-900 rounded-lg overflow-hidden border border-navy-700 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 bg-navy-800 border-b border-navy-700">
                  <h3 className="text-sm font-semibold text-white">{zoomedImage.alt}</h3>
                <button
                  onClick={closeImageZoom}
                    className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-yellow-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
              </div>
                <div className="p-4 bg-navy-900">
                <img 
                  src={zoomedImage.url} 
                  alt={zoomedImage.alt}
                    className="max-w-full max-h-[75vh] object-contain mx-auto rounded-lg"
                />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reports Modal */}
        <ReportsModal 
          isOpen={showReportsModal} 
          onClose={() => {
            setShowReportsModal(false)
            loadReportCount()
          }} 
        />

        {/* Suspend Confirmation Modal */}
        <AnimatePresence>
          {suspendConfirm && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSuspendConfirm(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-red-500/20 shadow-2xl rounded-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Ban className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Suspend User</h3>
                    <p className="text-xs text-red-300">This action will restrict user access</p>
                  </div>
                </div>
                <button
                  onClick={() => setSuspendConfirm(null)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-white mb-4">
                  Are you sure you want to suspend <span className="font-semibold text-red-400">{suspendConfirm.name}</span>?
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  The user will be unable to access their account until reactivated. This action can be reversed later.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setSuspendConfirm(null)}
                    className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSuspendUser(suspendConfirm.id, suspendConfirm.name)}
                    className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Suspend User
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Activate Confirmation Modal */}
        <AnimatePresence>
          {activateConfirm && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setActivateConfirm(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-navy-900 border-2 border-green-500/20 shadow-2xl rounded-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-2 border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Unlock className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Activate User</h3>
                    <p className="text-xs text-green-300">Restore user account access</p>
                  </div>
                </div>
                <button
                  onClick={() => setActivateConfirm(null)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-white mb-4">
                  Are you sure you want to activate <span className="font-semibold text-green-400">{activateConfirm.name}</span>?
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  The user will regain full access to their account and can use all platform features.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setActivateConfirm(null)}
                    className="flex-1 px-4 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleActivateUser(activateConfirm.id, activateConfirm.name)}
                    className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Activate User
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default UserManagementPage 