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
  Package,
  Filter,
  X,
  Download,
  Printer,
  ChevronDown,
  Loader2,
  Mail,
  Phone,
  Archive
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const AdminRequestsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [updatingRequestId, setUpdatingRequestId] = useState(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null)

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
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getRequestLocation = (request) => {
    // First check if request has a location field
    if (request.location) {
      return request.location
    }
    
    // Fall back to requester's location information
    const requester = request.requester
    if (!requester) {
      return 'Location not specified'
    }
    
    // Build location string from requester's address fields
    const locationParts = []
    if (requester.address_barangay) {
      locationParts.push(requester.address_barangay)
    }
    if (requester.address) {
      locationParts.push(requester.address)
    }
    if (requester.city) {
      locationParts.push(requester.city)
    }
    if (requester.province) {
      locationParts.push(requester.province)
    }
    
    if (locationParts.length > 0) {
      return locationParts.join(', ')
    }
    
    return 'Location not specified'
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'open':
        return {
          icon: Clock,
          label: 'Open',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          hoverColor: 'hover:bg-yellow-500/30'
        }
      case 'fulfilled':
        return {
          icon: CheckCircle,
          label: 'Fulfilled',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          hoverColor: 'hover:bg-green-500/30'
        }
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          hoverColor: 'hover:bg-red-500/30'
        }
      case 'expired':
        return {
          icon: AlertTriangle,
          label: 'Expired',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          hoverColor: 'hover:bg-gray-500/30'
        }
      default:
        return {
          icon: Clock,
          label: status,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          hoverColor: 'hover:bg-gray-500/30'
        }
    }
  }

  const handleViewRequest = (request) => {
    setSelectedRequest(request)
    setShowModal(true)
    setStatusDropdownOpen(null) // Close any open dropdowns
  }

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setUpdatingRequestId(requestId)
      await db.updateRequest(requestId, { status: newStatus })
      await loadRequests()
      
      // Update selected request if modal is open
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus })
      }
      
      // Close dropdown
      setStatusDropdownOpen(null)
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Failed to update request status. Please try again.')
    } finally {
      setUpdatingRequestId(null)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownOpen && !event.target.closest('.status-dropdown-container')) {
        setStatusDropdownOpen(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [statusDropdownOpen])

  // PDF and Print functions
  const generatePDF = async () => {
    if (!filteredRequests || filteredRequests.length === 0) {
      alert('No requests available to export')
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
        const title = 'Requests Management Report'
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Donation Requests List', pageWidth - margin - doc.getTextWidth('Donation Requests List'), 28)
        
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
      
      const tableData = filteredRequests.map(request => [
        request.title || '',
        request.requester?.name || 'Unknown',
        request.requester?.email || 'N/A',
        request.urgency || 'N/A',
        request.status || 'N/A',
        getRequestLocation(request),
        new Date(request.created_at).toLocaleDateString()
      ])
      
      const columns = ['Title', 'Requester', 'Email', 'Urgency', 'Status', 'Location', 'Created Date']
      
      let currentY = 50
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Requests: ${filteredRequests.length}`, margin, currentY)
      doc.text(`Open: ${filteredRequests.filter(r => r.status === 'open').length} | Fulfilled: ${filteredRequests.filter(r => r.status === 'fulfilled').length} | High Priority: ${filteredRequests.filter(r => r.urgency === 'high').length}`, margin + 60, currentY)
      
      currentY += 8
      
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
      
      doc.save(`requests_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if (!filteredRequests || filteredRequests.length === 0) {
      alert('No requests available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    const tableRows = filteredRequests.map(request => {
      return `
        <tr>
          <td>${request.title || ''}</td>
          <td>${request.requester?.name || 'Unknown'}</td>
          <td>${request.requester?.email || 'N/A'}</td>
          <td>${request.urgency || 'N/A'}</td>
          <td>${request.status || 'N/A'}</td>
          <td>${getRequestLocation(request)}</td>
          <td>${new Date(request.created_at).toLocaleDateString()}</td>
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
          <title>Requests Management Report - HopeLink</title>
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
            <div class="header-right"><h2>Requests Management Report</h2><p>Donation Requests List</p></div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Requests:</strong> ${filteredRequests.length} | <strong>Open:</strong> ${filteredRequests.filter(r => r.status === 'open').length} | <strong>Fulfilled:</strong> ${filteredRequests.filter(r => r.status === 'fulfilled').length} | <strong>High Priority:</strong> ${filteredRequests.filter(r => r.urgency === 'high').length} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead><tr><th>Title</th><th>Requester</th><th>Email</th><th>Urgency</th><th>Status</th><th>Location</th><th>Created Date</th></tr></thead>
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Requests Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Monitor and manage recipient requests</p>
            </div>
            {filteredRequests.length > 0 && (
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
                placeholder="Search requests by title or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>

              <div className="relative flex-1">
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Urgency</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{requests.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Requests</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'open').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Open Requests</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {requests.filter(r => r.status === 'fulfilled').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Fulfilled</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {requests.filter(r => r.urgency === 'high').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">High Priority</p>
              </div>
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
            <div className="min-w-[800px]">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Expiration
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
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
                        <div className="text-sm text-yellow-400 truncate max-w-xs">
                          {request.description}
                        </div>
                        <div className="flex items-center mt-1 text-xs text-yellow-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getRequestLocation(request)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div>
                        <div className="text-sm font-medium text-white">{request.requester?.name || 'Unknown'}</div>
                        <div className="text-sm text-yellow-400">{request.requester?.email || 'No email'}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                        {request.urgency}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="relative inline-block status-dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setStatusDropdownOpen(statusDropdownOpen === request.id ? null : request.id)
                          }}
                          disabled={updatingRequestId === request.id}
                          className={`
                            flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                            ${getStatusConfig(request.status).color}
                            ${updatingRequestId === request.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
                            focus:outline-none focus:ring-2 focus:ring-yellow-500/50
                          `}
                          title="Change Status"
                        >
                          {updatingRequestId === request.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              {(() => {
                                const InlineStatusIcon = getStatusConfig(request.status).icon
                                return <InlineStatusIcon className="h-3 w-3" />
                              })()}
                              <span className="capitalize">{request.status}</span>
                              <ChevronDown className={`h-3 w-3 transition-transform ${statusDropdownOpen === request.id ? 'rotate-180' : ''}`} />
                            </>
                          )}
                        </button>
                        {statusDropdownOpen === request.id && (
                          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-navy-800 border-2 border-yellow-500/30 rounded-lg shadow-2xl z-50 overflow-hidden text-left">
                            <div className="py-1">
                              {['open', 'fulfilled', 'cancelled', 'expired'].map((status) => {
                                if (status === request.status) return null
                                const config = getStatusConfig(status)
                                const DropIcon = config.icon
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusUpdate(request.id, status)
                                    }}
                                    className={`
                                      w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                                      ${config.color} ${config.hoverColor}
                                      transition-all hover:bg-navy-700/50
                                      border-l-2 ${config.borderColor}
                                    `}
                                  >
                                    <DropIcon className="h-4 w-4" />
                                    <span>{config.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-yellow-400">
                        {(request.expiry_date || request.expiration_date)
                          ? new Date(request.expiry_date || request.expiration_date).toLocaleDateString()
                          : 'Not provided'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(request.id, 'cancelled')}
                          className="p-2 text-orange-400 hover:text-orange-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No requests found</p>
              <p className="text-yellow-400 text-sm">
                {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Requests will appear here as they are created'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-navy-900 border-2 border-yellow-500/20 shadow-2xl rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-navy-900 to-navy-800 border-b-2 border-yellow-500/30 px-6 py-4 flex items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 border-2 border-yellow-500/20">
                  <Package className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-white truncate">{selectedRequest.title}</h3>
                  <p className="text-sm text-gray-400">Request Details</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-navy-800 text-gray-400 hover:text-yellow-400 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Request Header */}
              <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h4 className="text-lg font-bold text-white flex-1">{selectedRequest.title}</h4>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(selectedRequest.status)}`}>
                    {(() => {
                      const StatusIcon = getStatusConfig(selectedRequest.status).icon
                      return <StatusIcon className="h-4 w-4" />
                    })()}
                    <span className="capitalize">{selectedRequest.status}</span>
                  </span>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${getUrgencyColor(selectedRequest.urgency)}`}>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="capitalize">{selectedRequest.urgency} Priority</span>
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{selectedRequest.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-white">Posted Date</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    {new Date(selectedRequest.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-5 w-5 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-white">Location</h4>
                  </div>
                  <p className="text-sm text-gray-300">
                    {getRequestLocation(selectedRequest)}
                  </p>
                </div>
              </div>

              {/* Requester Information */}
              <div className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-navy-700">
                  <User className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-sm font-semibold text-white">Requester Information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Name</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-white font-medium">{selectedRequest.requester?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  {selectedRequest.requester?.email && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-white">{selectedRequest.requester.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedRequest.requester?.phone_number && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Phone</label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-white">{selectedRequest.requester.phone_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-navy-900 border-t-2 border-yellow-500/20 px-6 py-4 flex items-center justify-between gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-gray-300 hover:text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 border border-navy-700"
              >
                <X className="h-4 w-4" />
                Close
              </button>
              
              {/* Enhanced Status Dropdown in Footer */}
              <div className="relative status-dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setStatusDropdownOpen(statusDropdownOpen === `modal-${selectedRequest.id}` ? null : `modal-${selectedRequest.id}`)
                  }}
                  disabled={updatingRequestId === selectedRequest.id}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all
                    ${getStatusColor(selectedRequest.status)}
                    ${updatingRequestId === selectedRequest.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
                    focus:outline-none focus:ring-2 focus:ring-yellow-500/50
                  `}
                  title="Change Status"
                >
                  {updatingRequestId === selectedRequest.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const StatusIcon = getStatusConfig(selectedRequest.status).icon
                        return <StatusIcon className="h-4 w-4" />
                      })()}
                      <span className="capitalize">Change Status</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${statusDropdownOpen === `modal-${selectedRequest.id}` ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {/* Dropdown Menu */}
                {statusDropdownOpen === `modal-${selectedRequest.id}` && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-navy-800 border-2 border-yellow-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="py-1">
                      {['open', 'fulfilled', 'cancelled', 'expired'].map((status) => {
                        if (status === selectedRequest.status) return null
                        const config = getStatusConfig(status)
                        const StatusIcon = config.icon
                        return (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusUpdate(selectedRequest.id, status)
                            }}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
                              ${config.color} ${config.hoverColor}
                              transition-all hover:bg-navy-700/50
                              border-l-2 ${config.borderColor}
                            `}
                          >
                            <StatusIcon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default AdminRequestsPage