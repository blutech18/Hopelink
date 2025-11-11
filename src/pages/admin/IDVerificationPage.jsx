import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheck, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Check,
  X,
  Eye,
  Users,
  Mail,
  Phone,
  Download,
  Printer
} from 'lucide-react'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { supabase } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const IDVerificationPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [zoomedImage, setZoomedImage] = useState(null)
  const [showNoDocumentModal, setShowNoDocumentModal] = useState(false)
  const [userWithNoDocument, setUserWithNoDocument] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Use selective columns for better performance (avoid loading large image URLs unnecessarily)
      // Join with user_id_documents table to get ID verification fields
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone_number,
          role,
          is_verified,
          is_active,
          created_at,
          profile_image_url,
          id_documents:user_id_documents!user_id_documents_user_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(200) // Reduced limit for better performance

      if (error) throw error
      
      // Flatten ID document fields from joined table
      const flattenedUsers = (data || []).map(user => {
        const idDocuments = Array.isArray(user.id_documents) ? user.id_documents[0] : user.id_documents
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
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Determine actual status based on verification status and ID image
  const getActualStatus = (user) => {
    // If no ID image is uploaded, status should be "no_id" regardless of id_verification_status
    if (!user.primary_id_image_url) {
      return 'no_id'
    }
    // Otherwise, use the id_verification_status (verified, rejected, or pending)
    return user.id_verification_status || 'pending'
  }

  // Get unique roles from users (excluding admin)
  const availableRoles = Array.from(new Set(users
    .filter(user => user.role && user.role !== 'admin')
    .map(user => user.role)
  )).sort()

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const actualStatus = getActualStatus(user)
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole && user.role !== 'admin'
  })

  const handleApproveId = async (userId) => {
    try {
      // Update user verification status
      const { error: userError } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId)

      if (userError) {
        console.error('Error updating user verification:', userError)
      }

      // Update ID document verification status
      const { error } = await supabase
        .from('user_id_documents')
        .update({ verification_status: 'verified' })
        .eq('user_id', userId)

      if (error) {
        console.error('Error approving ID:', error)
        alert('Failed to approve verification. Please try again.')
        return
      }

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, id_verification_status: 'verified', is_verified: true } 
          : user
      ))

      alert('User verification approved successfully!')
    } catch (error) {
      console.error('Error approving ID:', error)
      alert('Failed to approve verification. Please try again.')
    }
  }

  const handleRejectId = async (userId) => {
    if (!confirm('Are you sure you want to reject this user\'s ID verification?')) {
      return
    }

    try {
      // Update ID document verification status
      const { error } = await supabase
        .from('user_id_documents')
        .update({ verification_status: 'rejected' })
        .eq('user_id', userId)

      if (error) {
        console.error('Error rejecting ID:', error)
        alert('Failed to reject verification. Please try again.')
        return
      }

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, id_verification_status: 'rejected' } 
          : user
      ))

      alert('User verification rejected.')
    } catch (error) {
      console.error('Error rejecting ID:', error)
      alert('Failed to reject verification. Please try again.')
    }
  }

  const handleViewUser = (userId) => {
    const user = users.find(u => u.id === userId)
    if (user && user.primary_id_image_url) {
      openImageZoom(user.primary_id_image_url, `Primary ID Document - ${user.name}`)
    } else if (user) {
      setUserWithNoDocument(user)
      setShowNoDocumentModal(true)
    }
  }

  const closeNoDocumentModal = () => {
    setShowNoDocumentModal(false)
    setUserWithNoDocument(null)
  }

  const openImageZoom = (imageUrl, altText) => {
    setZoomedImage({ url: imageUrl, alt: altText })
  }

  const closeImageZoom = () => {
    setZoomedImage(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'rejected': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'no_id': return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return CheckCircle
      case 'rejected': return XCircle
      case 'pending': return AlertTriangle
      case 'no_id': return FileText
      default: return FileText
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified': return 'Verified'
      case 'rejected': return 'Rejected'
      case 'pending': return 'Pending'
      case 'no_id': return 'No ID Uploaded'
      default: return 'Unknown'
    }
  }

  // PDF generation function
  const generatePDF = async () => {
    if (filteredUsers.length === 0) {
      alert('No users available to export')
      return
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      
      const primaryColor = [0, 26, 92]
      const secondaryColor = [0, 35, 125]
      
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
        const title = 'ID Verification Management Report'
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('User Verification Status', pageWidth - margin - doc.getTextWidth('User Verification Status'), 28)
        
        doc.setTextColor(0, 0, 0)
      }
      
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
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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

      let currentY = 50
      addHeader(1, 1)

      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Users: ${filteredUsers.length}`, margin, currentY)
      const noIdCount = filteredUsers.filter(u => getActualStatus(u) === 'no_id').length
      const pendingCount = filteredUsers.filter(u => getActualStatus(u) === 'pending').length
      const verifiedCount = filteredUsers.filter(u => getActualStatus(u) === 'verified').length
      const rejectedCount = filteredUsers.filter(u => getActualStatus(u) === 'rejected').length
      doc.text(`No ID: ${noIdCount} | Pending: ${pendingCount} | Verified: ${verifiedCount} | Rejected: ${rejectedCount}`, margin + 60, currentY)
      currentY += 8

      const tableData = filteredUsers.map(user => {
        const actualStatus = getActualStatus(user)
        return [
          user.name || '',
          user.email || '',
          user.phone_number || 'Not provided',
          user.primary_id_type || 'N/A',
          getStatusLabel(actualStatus)
        ]
      })
      
      const columns = ['Name', 'Email', 'Phone', 'ID Type', 'Status']
      
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
      
      const totalPages = doc.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addHeader(i, totalPages)
        addFooter(i, totalPages)
      }
      
      doc.save(`id_verification_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if (filteredUsers.length === 0) {
      alert('No users available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    // Calculate stats using actual status
    const noIdCount = filteredUsers.filter(u => getActualStatus(u) === 'no_id').length
    const pendingCount = filteredUsers.filter(u => getActualStatus(u) === 'pending').length
    const verifiedCount = filteredUsers.filter(u => getActualStatus(u) === 'verified').length
    const rejectedCount = filteredUsers.filter(u => getActualStatus(u) === 'rejected').length
    
    const tableRows = filteredUsers.map(user => {
      const actualStatus = getActualStatus(user)
      return `
        <tr>
          <td>${user.name || ''}</td>
          <td>${user.email || ''}</td>
          <td>${user.phone_number || 'Not provided'}</td>
          <td>${user.primary_id_type || 'N/A'}</td>
          <td>${getStatusLabel(actualStatus)}</td>
        </tr>
      `
    }).join('')
    
    const genDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ID Verification Management Report - HopeLink</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', 'Helvetica', sans-serif; padding: 0; color: #333; background: white; }
            .header { background: linear-gradient(135deg, #001a5c 0%, #00237d 100%); color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #cdd74a; }
            .header-left { display: flex; align-items: center; gap: 15px; }
            .logo-container { width: 50px; height: 50px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
            .logo-container img { max-width: 45px; max-height: 45px; }
            .brand-info h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .brand-info p { font-size: 12px; color: #cdd74a; }
            .header-right { text-align: right; }
            .header-right h2 { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .header-right p { font-size: 11px; color: #e0e0e0; font-style: italic; }
            .content { padding: 30px; }
            .summary { background: #f8f9fa; padding: 15px 20px; border-left: 4px solid #001a5c; margin-bottom: 25px; border-radius: 4px; }
            .summary p { font-size: 14px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            thead { background: #001a5c; color: white; }
            th { padding: 10px 8px; text-align: left; font-weight: bold; font-size: 11px; }
            td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .footer { background: #f5f5f5; padding: 15px 30px; border-top: 2px solid #ddd; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666; }
            .footer-center { text-align: center; font-style: italic; color: #888; }
            .footer-right { font-weight: bold; color: #001a5c; }
            @media print { body { padding: 0; } .header { page-break-after: avoid; } .footer { page-break-before: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } @page { margin: 1.5cm; size: A4 landscape; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="logo-container"><img src="/hopelinklogo.png" alt="HopeLink Logo" onerror="this.style.display='none'"></div>
              <div class="brand-info"><h1>HopeLink</h1><p>CFC-GK Community Platform</p></div>
            </div>
            <div class="header-right"><h2>ID Verification Management Report</h2><p>User Verification Status</p></div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Users:</strong> ${filteredUsers.length} | <strong>No ID:</strong> ${noIdCount} | <strong>Pending:</strong> ${pendingCount} | <strong>Verified:</strong> ${verifiedCount} | <strong>Rejected:</strong> ${rejectedCount} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>ID Type</th><th>Status</th></tr></thead>
              <tbody>${tableRows}</tbody>
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
    setTimeout(() => { printWindow.print() }, 500)
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">ID Verification Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Review and manage user identity verification</p>
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
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Status</option>
                  <option value="no_id">No ID Uploaded</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>
              
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Roles</option>
                  {availableRoles.map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{filteredUsers.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {filteredUsers.filter(u => getActualStatus(u) === 'pending').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Pending Review</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {filteredUsers.filter(u => getActualStatus(u) === 'verified').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Verified</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {filteredUsers.filter(u => getActualStatus(u) === 'rejected').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Rejected</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {filteredUsers.filter(u => getActualStatus(u) === 'no_id').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">No ID Uploaded</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    ID Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {filteredUsers.map((user, index) => {
                  const actualStatus = getActualStatus(user)
                  const StatusIcon = getStatusIcon(actualStatus)
                  
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-navy-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profile_image_url ? (
                            <img 
                              src={user.profile_image_url} 
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-yellow-500/30 flex-shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0 ${user.profile_image_url ? 'hidden' : ''}`}
                          >
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-yellow-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-yellow-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-yellow-400" />
                              <span>{user.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {user.primary_id_type || 'Not provided'}
                        </div>
                        {user.secondary_id_type && (
                          <div className="text-xs text-gray-400 mt-1">
                            Secondary: {user.secondary_id_type}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(actualStatus)}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {getStatusLabel(actualStatus)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {actualStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveId(user.id)}
                                className="p-2 text-green-400 hover:text-green-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                                title="Approve Verification"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectId(user.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                                title="Reject Verification"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleViewUser(user.id)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <ShieldCheck className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No users found matching your criteria</p>
              <p className="text-yellow-400 text-sm mt-1">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Users requiring verification will appear here'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Primary ID Document Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeImageZoom}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-navy-900 rounded-lg overflow-hidden border border-navy-700 shadow-2xl flex flex-col h-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-navy-800 border-b border-navy-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">{zoomedImage.alt}</h3>
                </div>
                <button
                  onClick={closeImageZoom}
                  className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-yellow-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Image Container - Takes full space between header and footer */}
              <div className="flex-1 overflow-auto bg-navy-900 p-4 flex items-center justify-center">
                <img 
                  src={zoomedImage.url} 
                  alt={zoomedImage.alt}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* No Document Modal */}
      {showNoDocumentModal && userWithNoDocument && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeNoDocumentModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-navy-900 rounded-lg overflow-hidden border border-navy-700 shadow-2xl flex flex-col h-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-navy-800 border-b border-navy-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-purple-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Primary ID Document - {userWithNoDocument.name}</h3>
                </div>
                <button
                  onClick={closeNoDocumentModal}
                  className="p-2 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-yellow-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Content Container - Takes full space between header and footer */}
              <div className="flex-1 overflow-auto bg-navy-900 p-4 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-32 w-32 text-gray-400 mx-auto mb-6" />
                  <h4 className="text-2xl font-semibold text-white mb-3">No Primary ID Document</h4>
                  <p className="text-gray-300 text-base">
                    This user has not uploaded their primary identification document yet.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default IDVerificationPage

