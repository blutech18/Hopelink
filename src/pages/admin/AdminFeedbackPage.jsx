import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Star, 
  MessageSquare, 
  Users,
  Gift,
  Heart,
  Truck,
  Filter,
  Download,
  Printer
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const AdminFeedbackPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [allFeedback, setAllFeedback] = useState([])
  const [filteredFeedback, setFilteredFeedback] = useState([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [stats, setStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    donorCount: 0,
    recipientCount: 0,
    volunteerCount: 0,
    donorAvg: 0,
    recipientAvg: 0,
    volunteerAvg: 0
  })

  useEffect(() => {
    loadAllFeedback()
  }, [])

  useEffect(() => {
    filterFeedback()
  }, [roleFilter, allFeedback])

  const loadAllFeedback = async () => {
    try {
      setLoading(true)
      const feedback = await db.getAllPlatformFeedback()
      setAllFeedback(feedback || [])
      calculateStats(feedback || [])
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (feedback) => {
    const totalFeedback = feedback.length
    const averageRating = totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0

    const donorFeedback = feedback.filter(f => f.user_role === 'donor')
    const recipientFeedback = feedback.filter(f => f.user_role === 'recipient')
    const volunteerFeedback = feedback.filter(f => f.user_role === 'volunteer')

    const donorAvg = donorFeedback.length > 0
      ? donorFeedback.reduce((sum, f) => sum + f.rating, 0) / donorFeedback.length
      : 0
    const recipientAvg = recipientFeedback.length > 0
      ? recipientFeedback.reduce((sum, f) => sum + f.rating, 0) / recipientFeedback.length
      : 0
    const volunteerAvg = volunteerFeedback.length > 0
      ? volunteerFeedback.reduce((sum, f) => sum + f.rating, 0) / volunteerFeedback.length
      : 0

    setStats({
      totalFeedback,
      averageRating,
      donorCount: donorFeedback.length,
      recipientCount: recipientFeedback.length,
      volunteerCount: volunteerFeedback.length,
      donorAvg,
      recipientAvg,
      volunteerAvg
    })
  }

  const filterFeedback = () => {
    if (roleFilter === 'all') {
      setFilteredFeedback(allFeedback)
    } else {
      setFilteredFeedback(allFeedback.filter(f => f.user_role === roleFilter))
    }
  }

  const getRoleIcon = (role) => {
    if (role === 'donor') return Gift
    if (role === 'recipient') return Heart
    if (role === 'volunteer') return Truck
    return Users
  }

  const getRoleColor = (role) => {
    if (role === 'donor') return 'text-blue-400'
    if (role === 'recipient') return 'text-green-400'
    if (role === 'volunteer') return 'text-purple-400'
    return 'text-gray-400'
  }

  const getRoleBgColor = (role) => {
    if (role === 'donor') return 'bg-blue-500/10 border-blue-500/30'
    if (role === 'recipient') return 'bg-green-500/10 border-green-500/30'
    if (role === 'volunteer') return 'bg-purple-500/10 border-purple-500/30'
    return 'bg-gray-500/10 border-gray-500/30'
  }

  const getQuestionLabel = (questionId) => {
    const labels = {
      // Donor questions
      'ease_of_posting': 'Ease of Posting',
      'matching_quality': 'Matching Quality',
      'communication': 'Communication',
      // Recipient questions
      'ease_of_requesting': 'Ease of Requesting',
      'item_quality': 'Item Quality',
      'delivery_experience': 'Delivery Experience',
      // Volunteer questions
      'task_clarity': 'Task Clarity',
      'route_efficiency': 'Route Efficiency',
      'support': 'Platform Support'
    }
    return labels[questionId] || questionId
  }

  // PDF and Print functions
  const generatePDF = async () => {
    if (!filteredFeedback || filteredFeedback.length === 0) {
      alert('No feedback available to export')
      return
    }

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4')
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
        const title = 'Feedback Management Report'
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Platform Feedback List', pageWidth - margin - doc.getTextWidth('Platform Feedback List'), 28)
        
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
      
      // Prepare table data - truncate long feedback text
      const tableData = filteredFeedback.map(feedback => {
        const feedbackText = feedback.feedback || ''
        const truncatedFeedback = feedbackText.length > 100 
          ? feedbackText.substring(0, 97) + '...' 
          : feedbackText
        
        return [
          feedback.user_name || feedback.user?.name || 'User',
          feedback.user_role || feedback.user?.role || '',
          feedback.rating || 0,
          truncatedFeedback,
          new Date(feedback.created_at).toLocaleDateString()
        ]
      })
      
      const columns = ['User Name', 'Role', 'Rating', 'Feedback', 'Date']
      
      let currentY = 50
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Feedback: ${filteredFeedback.length}`, margin, currentY)
      doc.text(`Average Rating: ${stats.averageRating.toFixed(1)}/5`, margin + 60, currentY)
      doc.text(`Donors: ${stats.donorCount} | Recipients: ${stats.recipientCount} | Volunteers: ${stats.volunteerCount}`, margin, currentY + 6)
      
      currentY += 12
      
      autoTable(doc, {
        startY: currentY,
        head: [columns],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
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
        columnStyles: {
          2: { cellWidth: 100 } // Feedback column wider
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
      
      doc.save(`feedback_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if (!filteredFeedback || filteredFeedback.length === 0) {
      alert('No feedback available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    const tableRows = filteredFeedback.map(feedback => {
      const feedbackText = feedback.feedback || ''
      const truncatedFeedback = feedbackText.length > 150 
        ? feedbackText.substring(0, 147) + '...' 
        : feedbackText
      
      return `
        <tr>
          <td>${feedback.user_name || feedback.user?.name || 'User'}</td>
          <td>${feedback.user_role || feedback.user?.role || ''}</td>
          <td>${feedback.rating || 0}/5</td>
          <td>${truncatedFeedback}</td>
          <td>${new Date(feedback.created_at).toLocaleDateString()}</td>
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
          <title>Feedback Management Report - HopeLink</title>
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
            @media print { body { padding: 0; } .header { page-break-after: avoid; } .footer { page-break-before: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } @page { margin: 1.5cm; size: A4; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="logo-container"><img src="/hopelinklogo.png" alt="HopeLink Logo" onerror="this.style.display='none'"></div>
              <div class="brand-info"><h1>HopeLink</h1><p>CFC-GK Community Platform</p></div>
            </div>
            <div class="header-right"><h2>Feedback Management Report</h2><p>Platform Feedback List</p></div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Feedback:</strong> ${filteredFeedback.length} | <strong>Average Rating:</strong> ${stats.averageRating.toFixed(1)}/5 | <strong>Donors:</strong> ${stats.donorCount} | <strong>Recipients:</strong> ${stats.recipientCount} | <strong>Volunteers:</strong> ${stats.volunteerCount} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead><tr><th>User Name</th><th>Role</th><th>Rating</th><th>Feedback</th><th>Date</th></tr></thead>
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Feedback Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">View and manage platform feedback</p>
            </div>
            {filteredFeedback.length > 0 && (
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
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {/* Total Feedback */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Total Feedback</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalFeedback}</div>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-yellow-300">{stats.averageRating.toFixed(1)} avg</span>
            </div>
          </div>

          {/* Donor Feedback */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-400">Donors</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.donorCount}</div>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-yellow-300">{stats.donorAvg.toFixed(1)} avg</span>
            </div>
          </div>

          {/* Recipient Feedback */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-green-400" />
              <span className="text-sm text-gray-400">Recipients</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.recipientCount}</div>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-yellow-300">{stats.recipientAvg.toFixed(1)} avg</span>
            </div>
          </div>

          {/* Volunteer Feedback */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-5 w-5 text-purple-400" />
              <span className="text-sm text-gray-400">Volunteers</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.volunteerCount}</div>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-yellow-300">{stats.volunteerAvg.toFixed(1)} avg</span>
            </div>
          </div>
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4 sm:p-5 border border-gray-600 mb-6" style={{backgroundColor: '#001a5c'}}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium text-white whitespace-nowrap">Filter by Role:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'donor', 'recipient', 'volunteer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    roleFilter === role
                      ? 'bg-yellow-600 text-white shadow-lg'
                      : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Feedback List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {filteredFeedback.length === 0 ? (
            <div className="card p-8 border border-gray-600 text-center" style={{backgroundColor: '#001a5c'}}>
              <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No feedback found</p>
              <p className="text-yellow-400 text-sm mt-2">
                {roleFilter !== 'all'
                  ? 'Try selecting a different filter'
                  : 'Feedback will appear here as users submit it'
                }
              </p>
            </div>
          ) : (
            filteredFeedback.map((feedback, index) => {
              const RoleIcon = getRoleIcon(feedback.user_role)
              return (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card p-4 sm:p-5 border border-gray-600" 
                  style={{backgroundColor: '#001a5c'}}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg border ${getRoleBgColor(feedback.user_role)}`}>
                        <RoleIcon className={`h-5 w-5 ${getRoleColor(feedback.user_role)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white capitalize">
                            {feedback.user_name || feedback.user?.name || 'User'}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400 capitalize">
                            {feedback.user_role || feedback.user?.role || ''}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= feedback.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-yellow-300 ml-1">
                            {feedback.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Text */}
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm leading-relaxed break-words">
                      {feedback.feedback}
                    </p>
                  </div>

                  {/* Role-Specific Answers */}
                  {feedback.role_specific_answers && Object.keys(feedback.role_specific_answers).length > 0 && (
                    <div className="bg-navy-900/50 rounded-lg p-3 sm:p-4 border border-navy-700">
                      <h4 className="text-xs font-semibold text-yellow-400 mb-3 uppercase">
                        Detailed Ratings
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(feedback.role_specific_answers).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {getQuestionLabel(key)}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= value
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-600'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-yellow-300 ml-1">{value}/5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AdminFeedbackPage

