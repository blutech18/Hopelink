import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  Edit,
  Archive,
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Building,
  Users,
  Download,
  Printer,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const AdminDonationsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false)
  const [donationToArchive, setDonationToArchive] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingDonationId, setUpdatingDonationId] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null)

  useEffect(() => {
    loadDonations()
  }, [])

  const loadDonations = async () => {
    try {
      setLoading(true)
      
      // Fetch recent donations with limit for better performance
      const donationsData = await db.getDonations({ limit: 100 })
      setDonations(donationsData || [])
    } catch (error) {
      console.error('Error loading donations:', error)
      setDonations([]) // Fallback to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredDonations = donations.filter(donation => {
    const donorName = donation.donor?.name || ''
    const matchesSearch = donation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donorName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || donation.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || donation.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-500/20'
      case 'claimed': return 'text-yellow-400 bg-yellow-500/20'
      case 'delivered': return 'text-blue-400 bg-blue-500/20'
      case 'expired': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return CheckCircle
      case 'claimed': return Clock
      case 'delivered': return Package
      case 'expired': return XCircle
      default: return Clock
    }
  }

  const handleViewDonation = (donation) => {
    setSelectedDonation(donation)
    setShowModal(true)
    setStatusDropdownOpen(null) // Close any open dropdowns
  }

  const handleArchiveDonation = async (donationId) => {
    setDonationToArchive(donationId)
    setShowArchiveConfirmation(true)
  }

  const confirmArchiveDonation = async () => {
    if (!donationToArchive) return
    
    try {
      await db.updateDonation(donationToArchive, { status: 'archived' })
      await loadDonations()
      setShowArchiveConfirmation(false)
      setDonationToArchive(null)
    } catch (error) {
      console.error('Error archiving donation:', error)
      alert('Failed to archive donation. Please try again.')
    }
  }

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      setUpdatingDonationId(donationId)
      setUpdatingStatus(true)
      await db.updateDonation(donationId, { status: newStatus })
      await loadDonations()
      
      // Update selected donation if modal is open
      if (selectedDonation && selectedDonation.id === donationId) {
        setSelectedDonation({ ...selectedDonation, status: newStatus })
      }
      
      // Close dropdown
      setStatusDropdownOpen(null)
    } catch (error) {
      console.error('Error updating donation status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(false)
      setUpdatingDonationId(null)
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusDropdownOpen])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'available':
        return {
          icon: CheckCircle,
          label: 'Available',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          hoverColor: 'hover:bg-green-500/30'
        }
      case 'claimed':
        return {
          icon: Clock,
          label: 'Claimed',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          hoverColor: 'hover:bg-yellow-500/30'
        }
      case 'delivered':
        return {
          icon: Package,
          label: 'Delivered',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30',
          hoverColor: 'hover:bg-blue-500/30'
        }
      case 'expired':
        return {
          icon: XCircle,
          label: 'Expired',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          hoverColor: 'hover:bg-red-500/30'
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

  // PDF and Print functions
  const generatePDF = async () => {
    if (!filteredDonations || filteredDonations.length === 0) {
      alert('No donations available to export')
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
        const title = 'Donations Management Report'
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Donations List', pageWidth - margin - doc.getTextWidth('Donations List'), 28)
        
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
      
      const tableData = filteredDonations.map(donation => [
        donation.title || '',
        donation.donor?.name || 'Unknown',
        donation.category || 'N/A',
        donation.status || 'N/A',
        donation.pickup_location || donation.city || 'N/A',
        new Date(donation.created_at).toLocaleDateString()
      ])
      
      const columns = ['Title', 'Donor', 'Category', 'Status', 'Location', 'Posted Date']
      
      let currentY = 50
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Donations: ${filteredDonations.length}`, margin, currentY)
      doc.text(`Available: ${filteredDonations.filter(d => d.status === 'available').length} | Claimed: ${filteredDonations.filter(d => d.status === 'claimed').length} | Delivered: ${filteredDonations.filter(d => d.status === 'delivered').length}`, margin + 60, currentY)
      
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
      
      doc.save(`donations_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if (!filteredDonations || filteredDonations.length === 0) {
      alert('No donations available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    const tableRows = filteredDonations.map(donation => {
      return `
        <tr>
          <td>${donation.title || ''}</td>
          <td>${donation.donor?.name || 'Unknown'}</td>
          <td>${donation.category || 'N/A'}</td>
          <td>${donation.status || 'N/A'}</td>
          <td>${donation.pickup_location || donation.city || 'N/A'}</td>
          <td>${new Date(donation.created_at).toLocaleDateString()}</td>
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
          <title>Donations Management Report - HopeLink</title>
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
            <div class="header-right"><h2>Donations Management Report</h2><p>Donations List</p></div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Donations:</strong> ${filteredDonations.length} | <strong>Available:</strong> ${filteredDonations.filter(d => d.status === 'available').length} | <strong>Claimed:</strong> ${filteredDonations.filter(d => d.status === 'claimed').length} | <strong>Delivered:</strong> ${filteredDonations.filter(d => d.status === 'delivered').length} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead><tr><th>Title</th><th>Donor</th><th>Category</th><th>Status</th><th>Location</th><th>Posted Date</th></tr></thead>
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Donations Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Monitor and manage all platform donations</p>
            </div>
            {filteredDonations.length > 0 && (
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
                placeholder="Search donations by title or donor..."
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
                  <option value="available">Available</option>
                  <option value="claimed">Claimed</option>
                  <option value="delivered">Delivered</option>
                  <option value="expired">Expired</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
              </div>

              <div className="relative flex-1">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
                >
                  <option value="all">All Categories</option>
                  <option value="Food">Food</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Education">Education</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Household">Household</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
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
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{donations.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Donations</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'available').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Available</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'claimed').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Claimed</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {donations.filter(d => d.status === 'delivered').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Delivered</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Donations List */}
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
                    Donation
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">
                    Category
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
                {filteredDonations.map((donation, index) => {
                  const StatusIcon = getStatusIcon(donation.status)
                  
                  return (
                    <motion.tr
                      key={donation.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-navy-800/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-white">{donation.title}</div>
                            
                          </div>
                          <div className="text-sm text-yellow-400 truncate max-w-xs">
                            {donation.description}
                          </div>
                          <div className="flex items-center mt-1 text-xs text-yellow-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {donation.pickup_location || donation.city || 'Location not specified'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div>
                          <div className="text-sm font-medium text-white">{donation.donor?.name || 'Unknown'}</div>
                          <div className="text-sm text-yellow-400">{donation.donor?.email || 'No email'}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          {donation.category}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="relative inline-block status-dropdown-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusDropdownOpen(statusDropdownOpen === donation.id ? null : donation.id)
                            }}
                            disabled={updatingDonationId === donation.id}
                            className={`
                              flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                              ${getStatusConfig(donation.status).color}
                              ${updatingDonationId === donation.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
                              focus:outline-none focus:ring-2 focus:ring-yellow-500/50
                            `}
                            title="Change Status"
                          >
                            {updatingDonationId === donation.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const InlineStatusIcon = getStatusConfig(donation.status).icon
                                  return <InlineStatusIcon className="h-3 w-3" />
                                })()}
                                <span className="capitalize">{donation.status}</span>
                                <ChevronDown className={`h-3 w-3 transition-transform ${statusDropdownOpen === donation.id ? 'rotate-180' : ''}`} />
                              </>
                            )}
                          </button>
                          {statusDropdownOpen === donation.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-navy-800 border-2 border-yellow-500/30 rounded-lg shadow-2xl z-50 overflow-hidden text-left">
                              <div className="py-1">
                                {['available', 'claimed', 'delivered', 'expired'].map((status) => {
                                  if (status === donation.status) return null
                                  const config = getStatusConfig(status)
                                  const DropIcon = config.icon
                                  return (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleStatusUpdate(donation.id, status)
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
                          {(donation.expiry_date || donation.expiration_date)
                            ? new Date(donation.expiry_date || donation.expiration_date).toLocaleDateString()
                            : 'Not provided'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewDonation(donation)}
                            className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveDonation(donation.id)}
                            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-navy-800 rounded-lg transition-all active:scale-95"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
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
          
          {filteredDonations.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-yellow-300">No donations found</p>
              <p className="text-yellow-400 text-sm">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Donations will appear here as they are posted'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Donation Details Modal */}
      {showModal && selectedDonation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowModal(false)}>
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Donation Details</h3>
                  <p className="text-xs text-yellow-300">Complete information</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-navy-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content with Custom Scrollbar */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="space-y-6">
                {/* Donation Header */}
                <div className="bg-navy-800/50 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-white mb-2">{selectedDonation.title}</h4>
                      <p className="text-sm text-gray-400">{selectedDonation.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-300 border border-yellow-500/30">
                        {selectedDonation.category}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(selectedDonation.status)}`}>
                        {selectedDonation.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-blue-400" />
                      <label className="text-sm font-semibold text-yellow-300">Destination</label>
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedDonation.donation_destination === 'organization' ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 w-fit">
                            <Building className="h-4 w-4" />
                            Direct to Organization
                          </span>
                          {selectedDonation.delivery_mode && (
                            <p className="text-white text-sm">
                              {selectedDonation.delivery_mode === 'donor_delivery' ? 'Donor will deliver to organization' : 
                               selectedDonation.delivery_mode === 'volunteer' ? 'Volunteer delivery to organization' : 
                               selectedDonation.delivery_mode === 'organization_pickup' ? 'Organization will pick up' :
                               selectedDonation.delivery_mode}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 w-fit">
                            <Users className="h-4 w-4" />
                            To Recipients
                          </span>
                          {selectedDonation.delivery_mode && (
                            <p className="text-white text-sm">
                              {selectedDonation.delivery_mode === 'pickup' ? 'Pickup' : selectedDonation.delivery_mode === 'volunteer' ? 'Volunteer Delivery' : 'Direct Delivery'}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      <label className="text-sm font-semibold text-yellow-300">Posted Date</label>
                    </div>
                    <p className="text-white text-lg font-medium">{new Date(selectedDonation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Donor Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-green-400" />
                      <label className="text-sm font-semibold text-yellow-300">Donor Name</label>
                    </div>
                    <p className="text-white text-lg font-medium">{selectedDonation.donor?.name || 'Anonymous'}</p>
                  </div>

                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-green-400" />
                      <label className="text-sm font-semibold text-yellow-300">Donor Email</label>
                    </div>
                    <p className="text-white text-lg font-medium">{selectedDonation.donor?.email || 'Not provided'}</p>
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-400" />
                    <label className="text-sm font-semibold text-yellow-300">Pickup Location</label>
                  </div>
                  <p className="text-white text-lg font-medium">{selectedDonation.pickup_location || selectedDonation.city || 'Not specified'}</p>
                </div>

                {/* Images Section */}
                {selectedDonation.images && selectedDonation.images.length > 0 && (
                  <div className="bg-navy-800/30 rounded-lg p-4 border border-navy-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-pink-400" />
                      <label className="text-sm font-semibold text-yellow-300">Donation Images</label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedDonation.images.map((image, index) => (
                        <div 
                          key={index} 
                          className="relative group cursor-pointer"
                          onClick={() => {
                            setSelectedImage(image)
                            setShowImageModal(true)
                          }}
                        >
                          <img
                            src={image}
                            alt={`Donation ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-navy-700 hover:border-yellow-500 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t-2 border-yellow-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 flex-1">
                <label className="text-xs font-medium text-gray-400">Update Status:</label>
                {/* Enhanced Status Dropdown */}
                <div className="relative status-dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatusDropdownOpen(statusDropdownOpen === `modal-${selectedDonation.id}` ? null : `modal-${selectedDonation.id}`)
                    }}
                    disabled={updatingDonationId === selectedDonation.id}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all
                      ${getStatusColor(selectedDonation.status)}
                      ${updatingDonationId === selectedDonation.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
                      focus:outline-none focus:ring-2 focus:ring-yellow-500/50
                    `}
                    title="Change Status"
                  >
                    {updatingDonationId === selectedDonation.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const StatusIcon = getStatusConfig(selectedDonation.status).icon
                          return <StatusIcon className="h-4 w-4" />
                        })()}
                        <span className="capitalize">{selectedDonation.status}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${statusDropdownOpen === `modal-${selectedDonation.id}` ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {statusDropdownOpen === `modal-${selectedDonation.id}` && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-navy-800 border-2 border-yellow-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
                      <div className="py-1">
                        {['available', 'claimed', 'delivered', 'expired'].map((status) => {
                          if (status === selectedDonation.status) return null
                          const config = getStatusConfig(status)
                          const StatusIcon = config.icon
                          return (
                            <button
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(selectedDonation.id, status)
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
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors border border-navy-600"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showArchiveConfirmation}
        onClose={() => {
          setShowArchiveConfirmation(false)
          setDonationToArchive(null)
        }}
        onConfirm={confirmArchiveDonation}
        title="Archive Donation"
        message="Are you sure you want to archive this donation? This action will move the donation to archived status."
        confirmText="Yes, Archive"
        cancelText="Cancel"
        type="warning"
        confirmButtonVariant="danger"
      />

      {/* Image View Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" 
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Full size donation image"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDonationsPage 