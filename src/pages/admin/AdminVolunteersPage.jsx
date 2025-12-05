import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Truck, 
  Search, 
  User,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Package,
  Phone,
  Mail,
  Award,
  Download,
  Printer,
  X,
  Building2,
  Globe,
  Camera,
  AlertCircle,
  Heart,
  Gift,
  Star,
  MessageSquare,
  Eye,
  Trash2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/supabase'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { IDVerificationBadge } from '../../components/ui/VerificationBadge'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const VEHICLE_TYPE_LABELS = {
  motorcycle: 'Motorcycle',
  car: 'Car / Sedan',
  suv: 'SUV',
  van: 'Van',
  pickup_truck: 'Pickup Truck',
  truck: 'Truck',
  other: 'Other'
}

const AdminVolunteersPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [volunteers, setVolunteers] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [donations, setDonations] = useState([])
  const [donationTitleByPickup, setDonationTitleByPickup] = useState({})
  const [donationTitleById, setDonationTitleById] = useState({})
  const [claimTitleById, setClaimTitleById] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileImageModal, setShowProfileImageModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)

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

  const handleViewProfile = async (volunteer) => {
    try {
      // Fetch full volunteer profile data
      const profile = await db.getProfile(volunteer.id)
      if (profile) {
        setSelectedVolunteer(profile)
        setShowProfileModal(true)
      }
    } catch (error) {
      console.error('Error fetching volunteer profile:', error)
      // Fallback to using the volunteer data we already have
      setSelectedVolunteer(volunteer)
      setShowProfileModal(true)
    }
  }

  useEffect(() => {
    loadVolunteersAndDeliveries()
  }, [])

  const loadVolunteersAndDeliveries = async () => {
    try {
      setLoading(true)
      
      // Fetch volunteers and deliveries with limits for better performance
      const [volunteersData, deliveriesData, donationsData] = await Promise.all([
        db.getVolunteers({ limit: 100 }),
        db.getDeliveries({ limit: 50 }),
        db.getDonations({ limit: 200 })
      ])
      
      // Enrich volunteers with capacity information
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + 1) // Monday
      startOfWeek.setHours(0, 0, 0, 0)
      
      const enrichedVolunteers = await Promise.all((volunteersData || []).map(async (volunteer) => {
        const volunteerDeliveries = deliveriesData.filter(d => d.volunteer_id === volunteer.id)
        const thisWeekDeliveries = volunteerDeliveries.filter(d => {
          const deliveryDate = new Date(d.created_at || d.assigned_at)
          return deliveryDate >= startOfWeek
        })
        const activeThisWeek = thisWeekDeliveries.filter(d => 
          ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(d.status)
        ).length
        
        const volunteerProfile = await db.getProfile(volunteer.id).catch(() => volunteer)
        // Use vehicle_capacity (Maximum Weight Capacity) from profile; validate/normalize to a positive number
        const rawCapacity = volunteerProfile?.vehicle_capacity ?? volunteer?.vehicle_capacity
        const parsedCapacity = typeof rawCapacity === 'string' ? parseFloat(rawCapacity) : rawCapacity
        const maxCapacity = parsedCapacity && !isNaN(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null
        const capacityUtilization = maxCapacity ? Math.round((activeThisWeek / maxCapacity) * 100) : 0
        
        return {
          ...volunteer,
          activeThisWeek,
          vehicleType: volunteerProfile?.vehicle_type || volunteer?.vehicle_type || '',
          vehicle_type: volunteerProfile?.vehicle_type || volunteer?.vehicle_type || '',
          maxCapacity,
          capacityUtilization,
          totalDeliveries: volunteerDeliveries.length
        }
      }))
      
      setVolunteers(enrichedVolunteers)
      setDeliveries(deliveriesData || [])
      setDonations(donationsData || [])
      
      // Build a quick lookup from pickup_location to donation title
      // Normalization helper for address keys
      const normalize = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim()
      const titleMap = {}
      const titleById = {}
      const titleByClaimId = {}
      ;(donationsData || []).forEach(d => {
        if (d.pickup_location) {
          titleMap[normalize(d.pickup_location)] = d.title || 'Donation'
        }
        if (d.id) {
          titleById[d.id] = d.title || 'Donation'
        }
        // Map each claim.id -> donation.title
        const claims = Array.isArray(d.claims) ? d.claims : []
        claims.forEach(claim => {
          if (claim && claim.id) {
            titleByClaimId[String(claim.id)] = d.title || 'Donation'
          }
        })
      })
      setDonationTitleByPickup(titleMap)
      setDonationTitleById(titleById)
      setClaimTitleById(titleByClaimId)
    } catch (error) {
      console.error('Error loading volunteers and deliveries:', error)
      setVolunteers([]) // Fallback to empty arrays on error
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDelivery = async (delivery) => {
    if (!delivery?.id) return
    const confirmMsg = `Delete this delivery?\n\nDonation: ${delivery.donation_title || 'Delivery'}\nPickup: ${delivery.pickup_location || delivery.pickup_city || 'N/A'}\nDelivery: ${delivery.delivery_location || delivery.delivery_city || 'N/A'}`
    if (!window.confirm(confirmMsg)) return
    try {
      setDeletingId(delivery.id)
      await db.deleteDelivery(delivery.id)
      setDeliveries(prev => prev.filter(d => d.id !== delivery.id))
    } catch (err) {
      console.error('Failed to delete delivery', err)
      alert('Failed to delete delivery. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const openDeliveryModal = (delivery, donationTitle) => {
    if (!delivery) return
    const volunteer = delivery.volunteer || volunteers.find(v => v.id === delivery.volunteer_id)
    const detail = {
      ...delivery,
      donation_title: donationTitle || delivery.donation_title || 'Delivery',
      volunteer_name: volunteer?.name || 'Unassigned',
      volunteer_email: volunteer?.email || '',
    }
    setSelectedDelivery(detail)
    setShowDeliveryModal(true)
  }

  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = volunteer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const volunteerStatus = volunteer.is_active ? 'active' : 'inactive'
    const matchesStatus = statusFilter === 'all' || volunteerStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20'
      case 'inactive': return 'text-gray-400 bg-gray-500/20'
      case 'suspended': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20'
      case 'in_progress': return 'text-blue-400 bg-blue-500/20'
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      default: return 'text-yellow-400 bg-yellow-500/20'
    }
  }

  // Filter active volunteers only
  const activeVolunteers = filteredVolunteers.filter(v => v.is_active)

  // PDF generation function
  const generatePDF = async () => {
    if ((activeVolunteers.length === 0 && deliveries.length === 0)) {
      alert('No data available to export')
      return
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      
      const primaryColor = [0, 26, 92]
      const secondaryColor = [0, 35, 125]
      
      const addHeader = (pageNum, totalPages, title) => {
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
        const titleText = title || 'Volunteer Management Report'
        doc.text(titleText, pageWidth - margin - doc.getTextWidth(titleText), 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Volunteers & Deliveries', pageWidth - margin - doc.getTextWidth('Volunteers & Deliveries'), 28)
        
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

      // Active Volunteers Table
      if (activeVolunteers.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(60, 60, 60)
        doc.setFont('helvetica', 'bold')
        doc.text('Active Volunteers', margin, currentY)
        currentY += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(`Total Active Volunteers: ${activeVolunteers.length}`, margin, currentY)
        currentY += 8

        const volunteersData = activeVolunteers.map(volunteer => [
          volunteer.name || '',
          volunteer.email || '',
          volunteer.phone_number || 'Not provided',
          `${volunteer.city || ''}, ${volunteer.province || ''}`.trim() || 'N/A',
          volunteer.is_active ? 'Active' : 'Inactive',
          volunteer.total_deliveries || 0,
          volunteer.completed_deliveries || 0
        ])
        
        const volunteersColumns = ['Name', 'Email', 'Phone', 'Location', 'Status', 'Total Deliveries', 'Completed']
        
        autoTable(doc, {
          startY: currentY,
          head: [volunteersColumns],
          body: volunteersData,
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
          margin: { top: currentY, left: margin, right: margin, bottom: 20 }
        })

        currentY = doc.lastAutoTable.finalY + 15
      }

      // Recent Deliveries Table
      if (deliveries.length > 0) {
        // Get the Y position after the previous table, or start fresh if no volunteers table
        if (doc.lastAutoTable) {
          currentY = doc.lastAutoTable.finalY + 15
        } else {
          currentY = 50
        }
        
        // Add section title and summary
        doc.setFontSize(12)
        doc.setTextColor(60, 60, 60)
        doc.setFont('helvetica', 'bold')
        doc.text('Recent Deliveries', margin, currentY)
        currentY += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(`Total Deliveries: ${deliveries.length}`, margin, currentY)
        currentY += 8

        const deliveriesData = deliveries.slice(0, 50).map(delivery => {
          const volunteer = delivery.volunteer || volunteers.find(v => v.id === delivery.volunteer_id)
                      // Resolve donation title from donations data
                      const getDonationTitle = (d) => {
                        const normalize = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim()
                        // 1) by donation_id map
                        if (d.donation_id && donationTitleById[d.donation_id]) return donationTitleById[d.donation_id]
                        // 1b) by claim_id -> donation title (scan donations.claims)
                        if (d.claim_id && claimTitleById[d.claim_id]) return claimTitleById[d.claim_id]
                        // 2) by exact pickup address/location map
                        const keyAddr = normalize(d.pickup_address)
                        const keyLoc = normalize(d.pickup_location)
                        if (keyAddr && donationTitleByPickup[keyAddr]) return donationTitleByPickup[keyAddr]
                        if (keyLoc && donationTitleByPickup[keyLoc]) return donationTitleByPickup[keyLoc]
                        // 3) fuzzy match on pickup address
                        const addr = normalize(d.pickup_address || d.pickup_location || '')
                        if (addr && donations.length > 0) {
                          // exact ignoring case
                          const exact = donations.find(x => normalize(x.pickup_location) === addr)
                          if (exact?.title) return exact.title
                          // includes
                          const incl = donations.find(x => normalize(x.pickup_location).includes(addr) || addr.includes(normalize(x.pickup_location)))
                          if (incl?.title) return incl.title
                          // by city heuristic
                          if (d.delivery_city) {
                            const cityMatch = donations.find(x => normalize(x.pickup_location).includes(normalize(d.delivery_city)))
                            if (cityMatch?.title) return cityMatch.title
                          }
                        }
                        return 'Delivery'
                      }
                      const donationTitle = getDonationTitle(delivery)
          
          return [
            donationTitle,
            volunteer?.name || 'Unassigned',
            delivery.pickup_location || 'Not specified',
            delivery.delivery_location || 'Not specified',
            delivery.scheduled_delivery_date 
              ? new Date(delivery.scheduled_delivery_date).toLocaleDateString()
              : 'Not scheduled',
            delivery.status?.replace('_', ' ') || 'pending'
          ]
        })
        
        const deliveriesColumns = ['Donation', 'Volunteer', 'Pickup Location', 'Delivery Location', 'Scheduled Date', 'Status']
        
        autoTable(doc, {
          startY: currentY,
          head: [deliveriesColumns],
          body: deliveriesData,
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
          margin: { top: currentY, left: margin, right: margin, bottom: 20 }
        })
      }
      
      const totalPages = doc.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addHeader(i, totalPages, 'Volunteer Management Report')
        addFooter(i, totalPages)
      }
      
      doc.save(`volunteers_report_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = () => {
    if ((activeVolunteers.length === 0 && deliveries.length === 0)) {
      alert('No data available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    const volunteersRows = activeVolunteers.map(volunteer => {
      return `
        <tr>
          <td>${volunteer.name || ''}</td>
          <td>${volunteer.email || ''}</td>
          <td>${volunteer.phone_number || 'Not provided'}</td>
          <td>${`${volunteer.city || ''}, ${volunteer.province || ''}`.trim() || 'N/A'}</td>
          <td>${volunteer.is_active ? 'Active' : 'Inactive'}</td>
          <td>${volunteer.total_deliveries || 0}</td>
          <td>${volunteer.completed_deliveries || 0}</td>
        </tr>
      `
    }).join('')

    const deliveriesRows = deliveries.slice(0, 50).map(delivery => {
      const volunteer = delivery.volunteer || volunteers.find(v => v.id === delivery.volunteer_id)
      const donationTitle = delivery.claim?.donation?.title || 'Unknown Donation'
      
      return `
        <tr>
          <td>${donationTitle}</td>
          <td>${volunteer?.name || 'Unassigned'}</td>
          <td>${delivery.pickup_location || 'Not specified'}</td>
          <td>${delivery.delivery_location || 'Not specified'}</td>
          <td>${delivery.scheduled_delivery_date 
            ? new Date(delivery.scheduled_delivery_date).toLocaleDateString()
            : 'Not scheduled'}</td>
          <td>${delivery.status?.replace('_', ' ') || 'pending'}</td>
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
          <title>Volunteer Management Report - HopeLink</title>
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
            .section-title { font-size: 18px; font-weight: bold; color: #001a5c; margin-top: 30px; margin-bottom: 10px; }
            .section-title:first-of-type { margin-top: 0; }
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
            <div class="header-right"><h2>Volunteer Management Report</h2><p>Volunteers & Deliveries</p></div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Generated:</strong> ${genDate}</p>
            </div>
            
            ${activeVolunteers.length > 0 ? `
              <div class="section-title">Active Volunteers</div>
              <div class="summary">
                <p><strong>Total Active Volunteers:</strong> ${activeVolunteers.length}</p>
              </div>
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Status</th><th>Total Deliveries</th><th>Completed</th></tr></thead>
                <tbody>${volunteersRows}</tbody>
              </table>
            ` : ''}
            
            ${deliveries.length > 0 ? `
              <div class="section-title">Recent Deliveries</div>
              <div class="summary">
                <p><strong>Total Deliveries:</strong> ${deliveries.length}</p>
              </div>
              <table>
                <thead><tr><th>Donation</th><th>Volunteer</th><th>Pickup Location</th><th>Delivery Location</th><th>Scheduled Date</th><th>Status</th></tr></thead>
                <tbody>${deliveriesRows}</tbody>
              </table>
            ` : ''}
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Volunteer Management</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Monitor volunteers and delivery operations</p>
            </div>
            {(activeVolunteers.length > 0 || deliveries.length > 0) && (
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
                placeholder="Search volunteers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
              />
            </div>
            
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none w-full px-5 py-3 sm:py-2.5 pr-10 bg-navy-800 border-2 border-navy-700 rounded-lg text-white text-sm sm:text-base font-medium focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 cursor-pointer hover:border-yellow-600"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Truck className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-400 pointer-events-none" />
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
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">{volunteers.length}</p>
                <p className="text-yellow-300 text-xs sm:text-sm">Total Volunteers</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {volunteers.filter(v => v.is_active).length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Active Volunteers</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'in_progress').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Active Deliveries</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
                <p className="text-yellow-300 text-xs sm:text-sm">Completed Today</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Volunteers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card overflow-hidden mb-6"
        >
          <div className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Active Volunteers</h2>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-700 text-xs text-gray-300">
                {activeVolunteers.length}
                  </span>
            </div>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">Volunteer</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Contact</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Location</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Vehicle Type</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Capacity (kg)</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Deliveries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                {activeVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 sm:px-6 py-12 text-center">
                        <User className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <p className="text-yellow-300">No active volunteers found</p>
                        <p className="text-yellow-400 text-sm mt-1">
                          {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your filters'
                          : 'Active volunteers will appear here'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                  activeVolunteers.map((volunteer, index) => (
                      <motion.tr
                        key={volunteer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-navy-800/50 transition-colors"
                      >
                        <td 
                          className="px-4 sm:px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-navy-800/70 transition-colors"
                          onClick={() => handleViewProfile(volunteer)}
                        >
                          <div className="flex items-center gap-3">
                            {volunteer.profile_image_url ? (
                              <img 
                                src={volunteer.profile_image_url} 
                                alt={volunteer.name}
                                className="w-10 h-10 rounded-lg object-cover border-2 border-yellow-500/30 flex-shrink-0"
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
                              className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0 ${volunteer.profile_image_url ? 'hidden' : ''}`}
                            >
                              {volunteer.name?.charAt(0).toUpperCase() || 'V'}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{volunteer.name}</div>
                              {volunteer.is_verified && (
                                <div className="flex items-center gap-1 mt-1">
                                  <CheckCircle className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-green-400">Verified</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <div className="text-sm text-gray-300 space-y-1">
                            <div className="flex items-center justify-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{volunteer.email}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span>{volunteer.phone_number || 'Not provided'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                            <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            <span>{volunteer.city}, {volunteer.province}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(volunteer.is_active ? 'active' : 'inactive')}`}>
                            {volunteer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <div className="text-sm text-gray-300">
                            {VEHICLE_TYPE_LABELS[volunteer.vehicleType] || volunteer.vehicleType || 'Not set'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          {volunteer.maxCapacity ? (
                            <div className="space-y-1 mx-auto max-w-[200px]">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <span className={`font-semibold ${
                                  volunteer.capacityUtilization >= 90 ? 'text-red-400' :
                                  volunteer.capacityUtilization >= 75 ? 'text-orange-400' :
                                  volunteer.capacityUtilization >= 50 ? 'text-yellow-400' :
                                  'text-green-400'
                                }`}>
                                  {volunteer.activeThisWeek || 0} / {volunteer.maxCapacity}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({volunteer.capacityUtilization || 0}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    volunteer.capacityUtilization >= 90 ? 'bg-red-500' :
                                    volunteer.capacityUtilization >= 75 ? 'bg-orange-500' :
                                    volunteer.capacityUtilization >= 50 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(volunteer.capacityUtilization || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3 text-sm">
                            <div className="text-center">
                              <div className="text-white font-bold">{volunteer.total_deliveries || volunteer.totalDeliveries || 0}</div>
                              <div className="text-xs text-gray-400">Total</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-400 font-bold">{volunteer.completed_deliveries || 0}</div>
                              <div className="text-xs text-gray-400">Done</div>
                            </div>
                            <div className="text-center">
                              <div className="text-yellow-400 font-bold">{deliveries.filter(d => d.volunteer_id === volunteer.id && d.status === 'in_progress').length}</div>
                              <div className="text-xs text-gray-400">Active</div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </motion.div>

          {/* Recent Deliveries Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card overflow-hidden"
        >
          <div className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Recent Deliveries</h2>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-navy-700 text-xs text-gray-300">
                {deliveries.length}
              </span>
            </div>
          </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider">Donation</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Volunteer</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Pickup Location</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Delivery Location</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Scheduled Date</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-center text-xs font-medium text-yellow-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 sm:px-6 py-12 text-center">
                        <Package className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                        <p className="text-yellow-300">No deliveries found</p>
                        <p className="text-yellow-400 text-sm mt-1">Delivery activity will appear here</p>
                      </td>
                    </tr>
                  ) : (
                    deliveries.slice(0, 50).map((delivery, index) => {
                    const volunteer = delivery.volunteer || volunteers.find(v => v.id === delivery.volunteer_id)
                      const donationTitle =
                        delivery.donation_title ||
                        (delivery.delivery_city ? `Delivery to ${delivery.delivery_city}` : 'Delivery')
                      
                      return (
                        <motion.tr
                          key={delivery.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-navy-800/50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg flex-shrink-0">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="text-sm font-semibold text-white max-w-[200px] truncate">
                                {donationTitle}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                              <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                              <span>{volunteer?.name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <div className="flex items-start justify-center gap-2 text-sm text-gray-300 max-w-[200px] mx-auto">
                              <MapPin className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="truncate">
                                {delivery.pickup_location || delivery.pickup_address || delivery.pickup_city || 'Not specified'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <div className="flex items-start justify-center gap-2 text-sm text-gray-300 max-w-[200px] mx-auto">
                              <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                              <span className="truncate">
                                {delivery.delivery_location || delivery.delivery_address || delivery.delivery_city || 'Not specified'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                              <Calendar className="h-3.5 w-3.5 text-yellow-400" />
                              <span>
                                {delivery.scheduled_delivery_date 
                                  ? new Date(delivery.scheduled_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'Not scheduled'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDeliveryStatusColor(delivery.status)}`}>
                              {delivery.status?.replace('_', ' ') || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  openDeliveryModal(delivery, donationTitle)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy-950 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-all active:scale-95"
                                title="View donation"
                                aria-label="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDeleteDelivery(delivery)
                                }}
                                disabled={deletingId === delivery.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete delivery"
                                aria-label="Delete"
                              >
                                {deletingId === delivery.id ? (
                                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
        </motion.div>

        {/* Volunteer Profile Modal */}
        <AnimatePresence>
          {showProfileModal && selectedVolunteer && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowProfileModal(false)
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-navy-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-yellow-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-navy-800 px-4 sm:px-6 py-4 border-b border-yellow-500/20 flex-shrink-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                        <Truck className="h-4 w-4 text-yellow-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white truncate">
                        Volunteer Profile
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-700 rounded-lg flex-shrink-0 ml-2"
                      aria-label="Close profile modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 custom-scrollbar">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Profile Header */}
                    <div className="relative flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div 
                          className="h-28 w-28 sm:h-36 sm:w-36 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg flex items-center justify-center cursor-pointer hover:border-yellow-400 transition-colors"
                          onClick={() => setShowProfileImageModal(true)}
                          title="View profile picture"
                        >
                          {selectedVolunteer?.profile_image_url ? (
                            <img 
                              src={selectedVolunteer.profile_image_url} 
                              alt={selectedVolunteer?.name || 'Volunteer'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-navy-700 flex items-center justify-center">
                              <User className="h-16 w-16 sm:h-20 sm:w-20 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        {/* View Overlay */}
                        <div
                          className="absolute inset-0 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none cursor-pointer"
                        >
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <h4 className="text-white font-bold text-base sm:text-lg mb-1">
                          {selectedVolunteer?.name || 'Anonymous'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            {(() => {
                              const memberDate = selectedVolunteer?.created_at;
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
                          {selectedVolunteer?.account_type && selectedVolunteer.account_type !== 'individual' && (
                            <span className="text-yellow-400 flex items-center gap-1 whitespace-nowrap">
                              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                              {selectedVolunteer.account_type === 'business' ? 'Business' : 'Organization'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ID Verification Badge - Top Right Corner */}
                      <div className="absolute top-0 right-0 flex-shrink-0">
                        <IDVerificationBadge
                          idStatus={selectedVolunteer?.id_verification_status}
                          hasIdUploaded={selectedVolunteer?.primary_id_type && selectedVolunteer?.primary_id_number}
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
                            <span className={`break-words flex-1 ${selectedVolunteer?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.birthdate ? (
                                new Date(selectedVolunteer.birthdate).toLocaleDateString('en-US', {
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
                            <span className={`break-words flex-1 ${selectedVolunteer?.birthdate ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.birthdate ? (calculateAge(selectedVolunteer.birthdate) || 'Not available') : 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Account Type:</span>
                            <span className={`break-words flex-1 ${selectedVolunteer?.account_type ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.account_type ? (selectedVolunteer.account_type === 'business' ? 'Business/Organization' : 'Individual') : 'Not provided'}
                            </span>
                          </div>
                          {selectedVolunteer?.account_type === 'business' && (
                            <>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Organization:</span>
                                <span className={`break-words flex-1 ${selectedVolunteer?.organization_name ? 'text-white' : 'text-gray-400 italic'}`}>
                                  {selectedVolunteer?.organization_name || 'Not provided'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-yellow-400 font-medium flex-shrink-0">Website:</span>
                                {selectedVolunteer?.website_link ? (
                                  <a
                                    href={selectedVolunteer.website_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-yellow-300 hover:text-yellow-200 break-all flex-1 flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3 flex-shrink-0" />
                                    {selectedVolunteer.website_link}
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
                              {selectedVolunteer?.phone_number || selectedVolunteer?.phone ? (
                                <a
                                  href={`tel:${selectedVolunteer.phone_number || selectedVolunteer.phone}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all"
                                >
                                  {selectedVolunteer.phone_number || selectedVolunteer.phone}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Email:</span>
                            <span className="text-white break-words flex-1">
                              {selectedVolunteer?.email ? (
                                <a
                                  href={`mailto:${selectedVolunteer.email}`}
                                  className="text-white hover:text-yellow-300 transition-colors break-all"
                                >
                                  {selectedVolunteer.email}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not provided</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        Address Details
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Street:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.address_street ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.address_street || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Barangay:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.address_barangay ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.address_barangay || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Landmark:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.address_landmark ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.address_landmark || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">City:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.city ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.city || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">Province:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.province ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.province || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-yellow-400 font-medium flex-shrink-0">ZIP Code:</span>
                          <span className={`break-words flex-1 ${selectedVolunteer?.zip_code ? 'text-white' : 'text-gray-400 italic'}`}>
                            {selectedVolunteer?.zip_code || 'Not provided'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Volunteer Details - 2x2 Grid */}
                    {selectedVolunteer?.role === 'volunteer' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Volunteer Details
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">ID Type:</span>
                            <span className={`break-words flex-1 ${selectedVolunteer?.primary_id_type ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.primary_id_type ? getIDTypeLabel(selectedVolunteer.primary_id_type) : 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Experience:</span>
                            <span className={`break-words flex-1 ${selectedVolunteer?.volunteer_experience ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.volunteer_experience || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-yellow-400 font-medium flex-shrink-0">Insurance:</span>
                            <span className={`break-words flex-1 ${selectedVolunteer?.has_insurance !== undefined ? 'text-white' : 'text-gray-400 italic'}`}>
                              {selectedVolunteer?.has_insurance !== undefined ? (selectedVolunteer.has_insurance ? 'Yes' : 'No') : 'Not provided'}
                            </span>
                          </div>
                          {selectedVolunteer?.has_insurance && (
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-yellow-400 font-medium flex-shrink-0">Insurance Provider:</span>
                              <span className={`break-words flex-1 ${selectedVolunteer?.insurance_provider ? 'text-white' : 'text-gray-400 italic'}`}>
                                {selectedVolunteer?.insurance_provider || 'Not provided'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preferred Delivery Types and Special Skills - 2 Column Layout */}
                    {selectedVolunteer?.role === 'volunteer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Preferred Delivery Types */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Preferred Delivery Types
                          </h5>
                          {selectedVolunteer?.preferred_delivery_types?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedVolunteer.preferred_delivery_types.map((type, i) => (
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
                          {selectedVolunteer?.special_skills?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedVolunteer.special_skills.map((skill, i) => (
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
                    {selectedVolunteer?.role === 'volunteer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Languages Spoken */}
                        <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                          <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            Languages Spoken
                          </h5>
                          {selectedVolunteer?.languages_spoken?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedVolunteer.languages_spoken.map((lang, i) => (
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
                          {selectedVolunteer?.communication_preferences?.length > 0 ? (
                            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
                              {selectedVolunteer.communication_preferences.map((pref, i) => (
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

                    {/* Bio/About */}
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        About
                      </h5>
                      <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedVolunteer?.bio ? 'text-yellow-200' : 'text-gray-400 italic'}`}>
                        {selectedVolunteer?.bio || 'Not provided'}
                      </p>
                    </div>

                    {/* Delivery Notes - Separate Section */}
                    {selectedVolunteer?.role === 'volunteer' && (
                      <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                        <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          Delivery Notes
                        </h5>
                        <p className={`text-xs sm:text-sm leading-relaxed break-words ${selectedVolunteer?.delivery_notes ? 'text-white' : 'text-gray-400 italic'}`}>
                          {selectedVolunteer?.delivery_notes || 'Not provided'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 sm:mt-4 pt-3 border-t border-yellow-500/20 px-4 sm:px-6 pb-4 flex-shrink-0">
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
          {showProfileImageModal && selectedVolunteer && (
            <div className="fixed inset-0 z-[60]">
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
                {selectedVolunteer?.profile_image_url ? (
                  <>
                    <img
                      src={selectedVolunteer.profile_image_url}
                      alt={selectedVolunteer?.name || 'Volunteer'}
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
        {/* Delivery Details Modal */}
        <AnimatePresence>
          {showDeliveryModal && selectedDelivery && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowDeliveryModal(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-navy-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-yellow-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-navy-800 px-4 sm:px-6 py-4 border-b border-yellow-500/20 flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                        <Package className="h-4 w-4 text-yellow-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white truncate">
                        {selectedDelivery.donation_title || 'Delivery Details'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getDeliveryStatusColor(selectedDelivery.status)}`}>
                        {selectedDelivery.status?.replace('_', ' ') || 'pending'}
                      </span>
                      <button
                        onClick={() => setShowDeliveryModal(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-navy-700 rounded-lg flex-shrink-0 ml-2"
                        aria-label="Close delivery modal"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Pickup</span>
                        </div>
                        <div className="text-sm text-gray-200 text-right max-w-[70%]">
                          {selectedDelivery.pickup_location || selectedDelivery.pickup_address || selectedDelivery.pickup_city || 'Not specified'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Delivery</span>
                        </div>
                        <div className="text-sm text-gray-200 text-right max-w-[70%]">
                          {selectedDelivery.delivery_location || selectedDelivery.delivery_address || selectedDelivery.delivery_city || 'Not specified'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Volunteer</span>
                        </div>
                        <div className="text-sm text-gray-200 text-right max-w-[70%]">
                          <div className="font-semibold">{selectedDelivery.volunteer_name}</div>
                          {selectedDelivery.volunteer_email && (
                            <div className="text-gray-300">{selectedDelivery.volunteer_email}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          <span className="text-white font-semibold text-sm">Scheduled Delivery</span>
                        </div>
                        <div className="text-sm text-gray-200 text-right max-w-[70%]">
                          {selectedDelivery.scheduled_delivery_date 
                            ? new Date(selectedDelivery.scheduled_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Not scheduled'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-navy-800/30 rounded-lg p-3 border border-yellow-500/20">
                      <h5 className="text-white font-semibold mb-2 text-sm">Identifiers</h5>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div><span className="text-yellow-400">Delivery ID:</span> <span className="break-all">{selectedDelivery.id}</span></div>
                        {selectedDelivery.claim_id && (<div><span className="text-yellow-400">Claim ID:</span> <span className="break-all">{selectedDelivery.claim_id}</span></div>)}
                        {selectedDelivery.donation_id && (<div><span className="text-yellow-400">Donation ID:</span> <span className="break-all">{selectedDelivery.donation_id}</span></div>)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-4 pt-3 border-t border-yellow-500/20 px-4 sm:px-6 pb-4 flex-shrink-0 flex justify-end">
                  <button
                    onClick={() => setShowDeliveryModal(false)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-navy-700 hover:bg-navy-600 border border-yellow-500/30 rounded-lg transition-all active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AdminVolunteersPage 