import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  Users, 
  Package, 
  Truck, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Building,
  MessageSquare,
  PieChart,
  Heart,
  Download,
  Printer
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import { db, supabase } from '../../lib/supabase'
import { DashboardSkeleton } from '../../components/ui/Skeleton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])
  const [chartData, setChartData] = useState({
    userDistribution: [],
    donationsOverTime: [],
    requestsByStatus: [],
    donationsByCategory: [],
    activityTrends: [],
    deliveryStatus: [],
    eventsByStatus: [],
    donationsByStatus: [],
    eventsOverTime: [],
    userRegistrationTrends: []
  })

  useEffect(() => {
    loadAdminStats()

    // Set up real-time subscriptions for admin dashboard
    let donationsSubscription
    let requestsSubscription
    let usersSubscription
    let deliveriesSubscription
    let eventsSubscription

    if (supabase) {
      // Subscribe to donations table changes
      donationsSubscription = supabase
        .channel('admin_donations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donations'
          },
          () => {
            console.log('📊 Admin: Donation change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to requests table changes
      requestsSubscription = supabase
        .channel('admin_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'donation_requests'
          },
          () => {
            console.log('📊 Admin: Request change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to users table changes
      usersSubscription = supabase
        .channel('admin_users')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users'
          },
          () => {
            console.log('📊 Admin: User change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to deliveries table changes
      deliveriesSubscription = supabase
        .channel('admin_deliveries')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deliveries'
          },
          () => {
            console.log('📊 Admin: Delivery change detected')
            loadAdminStats()
          }
        )
        .subscribe()

      // Subscribe to events table changes
      eventsSubscription = supabase
        .channel('admin_events')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events'
          },
          () => {
            console.log('📊 Admin: Event change detected')
            loadAdminStats()
          }
        )
        .subscribe()
    }

    // Cleanup subscriptions
    return () => {
      if (donationsSubscription) {
        supabase.removeChannel(donationsSubscription)
      }
      if (requestsSubscription) {
        supabase.removeChannel(requestsSubscription)
      }
      if (usersSubscription) {
        supabase.removeChannel(usersSubscription)
      }
      if (deliveriesSubscription) {
        supabase.removeChannel(deliveriesSubscription)
      }
      if (eventsSubscription) {
        supabase.removeChannel(eventsSubscription)
      }
    }
  }, [])

  const loadAdminStats = async () => {
    try {
      setLoading(true)
      
      // Step 1: Load statistics first (fast count queries)
      const [userCounts, donationCounts, requestCounts, deliveryCounts, eventCounts] = await Promise.all([
        db.getUserCounts(),
        db.getDonationCounts(),
        db.getRequestCounts(),
        db.getDeliveryCounts(),
        db.getEventCounts()
      ])
      
      // Set statistics from counts immediately
      setStats({
        totalUsers: userCounts.total,
        totalDonations: donationCounts.total,
        activeVolunteers: userCounts.activeVolunteers,
        pendingRequests: requestCounts.open,
        verifiedUsers: userCounts.verified,
        unverifiedUsers: userCounts.unverified,
        completedDeliveries: deliveryCounts.delivered,
        pendingDeliveries: deliveryCounts.pending,
        verifiedDonors: userCounts.verifiedDonors,
        totalDonors: userCounts.donors,
        totalRecipients: userCounts.recipients,
        totalVolunteers: userCounts.volunteers,
        matchedDonations: donationCounts.matchedOrClaimed,
        deliveredDonations: donationCounts.deliveredOrCompleted,
        availableDonations: donationCounts.available,
        fulfilledRequests: requestCounts.fulfilled,
        totalEvents: eventCounts.total,
        completedEvents: eventCounts.completed,
        activeEvents: eventCounts.active,
        upcomingEvents: eventCounts.upcoming,
        inTransitDeliveries: deliveryCounts.inTransit
      })
      
      // Step 2: Load chart data asynchronously (smaller dataset, only last 50 records)
      // This allows the page to render faster with stats, then charts load
      setChartsLoading(true)
      Promise.all([
        db.getAllUsers({ limit: 50 }),
        db.getDonations({ limit: 50 }),
        db.getRequests({ limit: 50 }),
        db.getDeliveries({ limit: 200 }),
        db.getEvents({ limit: 50 }),
      ]).then(([users, donations, requests, deliveries, events]) => {
        // Use unified deliveries table; includes delivery_mode to distinguish direct vs volunteer
        const allDeliveries = deliveries || []
        // Prepare chart data with filtered data
      prepareChartData(users, donations, requests, allDeliveries, events)
      
        // Create recent activity from latest data (only recent 5 items)
      const recentActivity = [
        ...donations.slice(0, 3).map(d => ({
          id: `donation-${d.id}`,
          type: 'donation_created',
          message: `New donation: ${d.title}`,
          timestamp: new Date(d.created_at).toLocaleDateString()
        })),
        ...requests.slice(0, 2).map(r => ({
          id: `request-${r.id}`,
          type: 'request_created', 
          message: `New request: ${r.title}`,
          timestamp: new Date(r.created_at).toLocaleDateString()
        })),
        ...events.slice(0, 2).map(e => ({
          id: `event-${e.id}`,
          type: 'event_created',
          message: `New event: ${e.name}`,
          timestamp: new Date(e.created_at).toLocaleDateString()
        }))
      ].slice(0, 5)
      
      setRecentActivity(recentActivity)
        setChartsLoading(false)
      }).catch(error => {
        console.error('Error loading chart data:', error)
        setChartsLoading(false)
        // Don't block the page if chart data fails to load
      })
      
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const prepareChartData = (users, donations, requests, deliveries, events = []) => {
    // Date ranges
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // User Distribution (Pie Chart)
    const userRoles = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})
    const userDistribution = [
      { name: 'Donors', value: userRoles.donor || 0, color: '#3b82f6' },
      { name: 'Recipients', value: userRoles.recipient || 0, color: '#10b981' },
      { name: 'Volunteers', value: userRoles.volunteer || 0, color: '#8b5cf6' },
      { name: 'Admins', value: userRoles.admin || 0, color: '#f59e0b' }
    ].filter(item => item.value > 0)

    // Donations Over Time (Last 30 days)
    
    const donationsByDateMap = new Map()
    donations
      .filter(d => new Date(d.created_at) >= thirtyDaysAgo)
      .forEach(donation => {
        const date = new Date(donation.created_at)
        const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format for sorting
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!donationsByDateMap.has(dateKey)) {
          donationsByDateMap.set(dateKey, { date: dateLabel, dateKey, donations: 0 })
        }
        donationsByDateMap.get(dateKey).donations++
      })

    const donationsOverTime = Array.from(donationsByDateMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ date, donations }) => ({ date, donations }))

    // Requests By Status (Bar Chart)
    const requestsByStatus = requests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1
      return acc
    }, {})
    const requestsByStatusData = [
      { name: 'Open', value: requestsByStatus.open || 0 },
      { name: 'Fulfilled', value: requestsByStatus.fulfilled || 0 },
      { name: 'Cancelled', value: requestsByStatus.cancelled || 0 },
      { name: 'Expired', value: requestsByStatus.expired || 0 }
    ].filter(item => item.value > 0)

    // Donations By Category (Bar Chart)
    const donationsByCategory = donations.reduce((acc, donation) => {
      const category = donation.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
    const donationsByCategoryData = Object.entries(donationsByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 categories

    // Activity Trends (Last 7 days) - Combined donations and requests
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const activityMap = new Map()
    
    // Process donations
    donations
      .filter(d => new Date(d.created_at) >= sevenDaysAgo)
      .forEach(donation => {
        const date = new Date(donation.created_at)
        const dateKey = date.toISOString().split('T')[0]
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!activityMap.has(dateKey)) {
          activityMap.set(dateKey, { date: dateLabel, dateKey, donations: 0, requests: 0 })
        }
        activityMap.get(dateKey).donations++
      })

    // Process requests
    requests
      .filter(r => new Date(r.created_at) >= sevenDaysAgo)
      .forEach(request => {
        const date = new Date(request.created_at)
        const dateKey = date.toISOString().split('T')[0]
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!activityMap.has(dateKey)) {
          activityMap.set(dateKey, { date: dateLabel, dateKey, donations: 0, requests: 0 })
        }
        activityMap.get(dateKey).requests++
      })

    const activityTrends = Array.from(activityMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ date, donations, requests }) => ({ date, donations, requests }))

    // Delivery Status (Pie Chart)
    const deliveryStatus = deliveries.reduce((acc, delivery) => {
      acc[delivery.status] = (acc[delivery.status] || 0) + 1
      return acc
    }, {})
    
    // Map all possible delivery statuses with colors
    // Includes both volunteer delivery statuses and direct delivery statuses
    const statusConfig = {
      // Volunteer delivery statuses
      pending: { name: 'Pending', color: '#f59e0b' },
      assigned: { name: 'Assigned', color: '#3b82f6' },
      accepted: { name: 'Accepted', color: '#8b5cf6' },
      picked_up: { name: 'Picked Up', color: '#06b6d4' },
      in_transit: { name: 'In Transit', color: '#3b82f6' },
      delivered: { name: 'Delivered', color: '#10b981' },
      cancelled: { name: 'Cancelled', color: '#ef4444' },
      // Direct delivery statuses
      coordination_needed: { name: 'Coordination Needed', color: '#f59e0b' },
      scheduled: { name: 'Scheduled', color: '#8b5cf6' },
      out_for_delivery: { name: 'Out for Delivery', color: '#3b82f6' }
    }
    
    // Create array with status key preserved for sorting
    const deliveryStatusEntries = Object.entries(deliveryStatus)
      .map(([status, count]) => ({
        status,
        name: statusConfig[status]?.name || status,
        value: count,
        color: statusConfig[status]?.color || '#6b7280'
      }))
      .filter(item => item.value > 0)
    
    // Sort by status order: pending/coordination_needed -> assigned -> accepted -> scheduled -> picked_up -> out_for_delivery -> in_transit -> delivered -> cancelled
    const statusOrder = [
      'pending', 'coordination_needed', 'assigned', 'accepted', 'scheduled', 
      'picked_up', 'out_for_delivery', 'in_transit', 'delivered', 'cancelled'
    ]
    const deliveryStatusData = deliveryStatusEntries.sort((a, b) => {
      const indexA = statusOrder.indexOf(a.status)
      const indexB = statusOrder.indexOf(b.status)
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })

    // Events By Status (Bar Chart)
    const eventsByStatus = events.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1
      return acc
    }, {})
    const eventsByStatusData = [
      { name: 'Active', value: eventsByStatus.active || 0 },
      { name: 'Upcoming', value: eventsByStatus.upcoming || 0 },
      { name: 'Completed', value: eventsByStatus.completed || 0 },
      { name: 'Cancelled', value: eventsByStatus.cancelled || 0 }
    ].filter(item => item.value > 0)

    // Donations By Status (Bar Chart)
    const donationsByStatus = donations.reduce((acc, donation) => {
      acc[donation.status] = (acc[donation.status] || 0) + 1
      return acc
    }, {})
    const donationsByStatusData = [
      { name: 'Available', value: donationsByStatus.available || 0 },
      { name: 'Matched', value: donationsByStatus.matched || 0 },
      { name: 'Claimed', value: donationsByStatus.claimed || 0 },
      { name: 'Delivered', value: donationsByStatus.delivered || 0 },
      { name: 'Completed', value: donationsByStatus.completed || 0 },
      { name: 'Cancelled', value: donationsByStatus.cancelled || 0 }
    ].filter(item => item.value > 0)

    // Events Over Time (Last 30 days)
    const eventsByDateMap = new Map()
    events
      .filter(e => new Date(e.created_at) >= thirtyDaysAgo)
      .forEach(event => {
        const date = new Date(event.created_at)
        const dateKey = date.toISOString().split('T')[0]
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!eventsByDateMap.has(dateKey)) {
          eventsByDateMap.set(dateKey, { date: dateLabel, dateKey, events: 0 })
        }
        eventsByDateMap.get(dateKey).events++
      })

    const eventsOverTime = Array.from(eventsByDateMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ date, events }) => ({ date, events }))

    // User Registration Trends (Last 30 days)
    const usersByDateMap = new Map()
    users
      .filter(u => new Date(u.created_at) >= thirtyDaysAgo)
      .forEach(user => {
        const date = new Date(user.created_at)
        const dateKey = date.toISOString().split('T')[0]
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!usersByDateMap.has(dateKey)) {
          usersByDateMap.set(dateKey, { date: dateLabel, dateKey, users: 0 })
        }
        usersByDateMap.get(dateKey).users++
      })

    const userRegistrationTrends = Array.from(usersByDateMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ date, users }) => ({ date, users }))

    setChartData({
      userDistribution,
      donationsOverTime,
      requestsByStatus: requestsByStatusData,
      donationsByCategory: donationsByCategoryData,
      activityTrends,
      deliveryStatus: deliveryStatusData,
      eventsByStatus: eventsByStatusData,
      donationsByStatus: donationsByStatusData,
      eventsOverTime,
      userRegistrationTrends
    })
  }

  // PDF and Print functions
  const generatePDF = async (title, data, columns, filename) => {
    if (!data || data.length === 0) {
      alert('No data available to export')
      return
    }

    try {
      const doc = new jsPDF('portrait', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin
      
      // System colors
      const primaryColor = [0, 26, 92] // #001a5c
      const secondaryColor = [0, 35, 125] // #00237d
      const accentColor = [205, 215, 74] // #cdd74a (yellow)
      
      // Header function
      const addHeader = (pageNum, totalPages) => {
        // Header background with gradient effect
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, pageWidth, 40, 'F')
        
        // Secondary color accent line
        doc.setFillColor(...secondaryColor)
        doc.rect(0, 38, pageWidth, 2, 'F')
        
        // HopeLink branding section
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('HopeLink', margin + 5, 20)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(205, 215, 74) // Yellow accent
        doc.text('CFC-GK Community Platform', margin + 5, 28)
        
        // Report title section
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        const titleWidth = doc.getTextWidth(title)
        const maxTitleWidth = pageWidth - 2 * margin - 80
        let displayTitle = title
        if (titleWidth > maxTitleWidth) {
          // Truncate title if too long
          doc.setFontSize(12)
          displayTitle = doc.splitTextToSize(title, maxTitleWidth)[0]
        }
        doc.text(displayTitle, pageWidth - margin - doc.getTextWidth(displayTitle), 20)
        
        // Report subtitle
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(200, 200, 200)
        doc.text('Analytics Report', pageWidth - margin - doc.getTextWidth('Analytics Report'), 28)
        
        // Reset text color
        doc.setTextColor(0, 0, 0)
      }
      
      // Footer function
      const addFooter = (pageNum, totalPages) => {
        const footerY = pageHeight - 20
        
        // Footer background
        doc.setFillColor(245, 245, 245)
        doc.rect(0, footerY - 8, pageWidth, 20, 'F')
        
        // Footer top border
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8)
        
        // Generation date
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
        
        // Page number
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 26, 92)
        const pageText = `Page ${pageNum} of ${totalPages}`
        doc.text(
          pageText,
          pageWidth - margin - doc.getTextWidth(pageText),
          footerY
        )
        
        // Confidential notice
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'italic')
        const confidentialText = 'HopeLink - Confidential Analytics Report'
        doc.text(
          confidentialText,
          pageWidth / 2 - doc.getTextWidth(confidentialText) / 2,
          footerY + 6
        )
        
        // Copyright
        doc.setFontSize(6)
        doc.setTextColor(150, 150, 150)
        const copyrightText = `© ${new Date().getFullYear()} HopeLink CFC-GK. All rights reserved.`
        doc.text(
          copyrightText,
          pageWidth / 2 - doc.getTextWidth(copyrightText) / 2,
          footerY + 10
        )
      }
      
      // Prepare table data
      const tableData = data.map(item => {
        return columns.map(col => {
          const value = item[col]
          if (typeof value === 'number') {
            return value.toLocaleString()
          }
          return value?.toString() || ''
        })
      })
      
      // Format column headers
      const formattedColumns = columns.map(col => {
        return col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ')
      })
      
      // Calculate available height for table
      const headerHeight = 45
      const footerHeight = 25
      
      // Add summary info before table
      let currentY = headerHeight + 15
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total Records: ${data.length}`, margin, currentY)
      
      currentY += 8
      
      // Add table with proper formatting using autoTable function
      autoTable(doc, {
        startY: currentY,
        head: [formattedColumns],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 11,
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [40, 40, 40],
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        styles: {
          cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
          lineWidth: 0.2,
          lineColor: [220, 220, 220],
          valign: 'middle'
        },
        margin: { top: currentY, left: margin, right: margin, bottom: footerHeight + 5 },
        didDrawPage: (data) => {
          // Add header and footer to each page
          const pageNumber = data.pageNumber
          // We'll calculate total pages after table is drawn
          addHeader(pageNumber, pageNumber)
        },
        didParseCell: (data) => {
          // Make first column bold
          if (data.column.index === 0 && data.row.index >= 0) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
        willDrawCell: (data) => {
          // Right align numbers
          if (typeof data.cell.text[0] !== 'undefined') {
            const text = data.cell.text[0].toString()
            if (!isNaN(text.replace(/,/g, '')) && data.column.index > 0) {
              data.cell.styles.halign = 'right'
            }
          }
        }
      })
      
      // Get final page count
      const totalPages = doc.internal.pages.length - 1
      
      // Redraw headers and footers with correct page numbers
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addHeader(i, totalPages)
        addFooter(i, totalPages)
      }
      
      // Save PDF
      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const handlePrint = (title, data, columns) => {
    if (!data || data.length === 0) {
      alert('No data available to print')
      return
    }

    const printWindow = window.open('', '_blank')
    
    // Format column headers
    const formattedColumns = columns.map(col => {
      return col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ')
    })
    
    const tableRows = data.map(item => {
      const cells = columns.map((col, index) => {
        const value = item[col]
        // Format the value appropriately
        let formattedValue = ''
        if (typeof value === 'number') {
          formattedValue = value.toLocaleString()
        } else {
          formattedValue = value?.toString() || ''
        }
        // Right align numbers, left align text
        const align = index > 0 && typeof value === 'number' ? 'text-right' : 'text-left'
        const fontWeight = index === 0 ? 'font-bold' : ''
        return `<td class="${align} ${fontWeight}">${formattedValue}</td>`
      }).join('')
      return `<tr>${cells}</tr>`
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
          <title>${title} - HopeLink Report</title>
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
              font-size: 12px;
            }
            thead {
              background: #001a5c;
              color: white;
            }
            th { 
              padding: 12px 10px; 
              text-align: left; 
              font-weight: bold;
              font-size: 13px;
            }
            td { 
              padding: 10px; 
              border-bottom: 1px solid #e0e0e0;
              font-size: 12px;
            }
            tr:nth-child(even) { 
              background-color: #f8f9fa; 
            }
            tr:hover {
              background-color: #e8f4f8;
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
              tfoot { display: table-footer-group; }
              @page { 
                margin: 1.5cm;
                size: A4;
              }
            }
            @page {
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #666;
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
              <h2>${title}</h2>
              <p>Analytics Report</p>
            </div>
          </div>
          <div class="content">
            <div class="summary">
              <p><strong>Total Records:</strong> ${data.length} | <strong>Generated:</strong> ${genDate}</p>
            </div>
            <table>
              <thead>
                <tr>
                  ${formattedColumns.map(col => `<th>${col}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div>© ${new Date().getFullYear()} HopeLink CFC-GK. All rights reserved.</div>
            <div class="footer-center">HopeLink - Confidential Analytics Report</div>
            <div class="footer-right">Generated: ${genDate}</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  // Chart Header Component with Actions
  const ChartHeader = ({ icon: Icon, title, data, columns, filename }) => {
    const hasData = data && data.length > 0
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0" />}
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
        </div>
        {hasData && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                try {
                  generatePDF(title, data, columns, filename).catch(err => {
                    console.error('PDF generation error:', err)
                    alert('Failed to generate PDF. Please try again.')
                  })
                } catch (error) {
                  console.error('PDF generation error:', error)
                  alert('Failed to generate PDF. Please try again.')
                }
              }}
              className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
              title="Download PDF"
              type="button"
              aria-label="Download PDF"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handlePrint(title, data, columns)
              }}
              className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
              title="Print"
              type="button"
              aria-label="Print"
            >
              <Printer className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const StatCard = ({ icon: Icon, title, value, description, trend, color = "yellow" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card p-4 sm:p-6 border border-gray-600"
      style={{backgroundColor: '#001a5c'}}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 sm:p-3 rounded-lg bg-navy-800`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-yellow-300`} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold text-white">{value}</h3>
            <p className="text-yellow-200 text-xs sm:text-sm">{title}</p>
          </div>
        </div>
        {trend && (
          <div className="flex items-center text-green-400 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {trend}
          </div>
        )}
      </div>
      {description && (
        <p className="text-yellow-300 text-xs mt-2">{description}</p>
      )}
    </motion.div>
  )

  const ActivityItem = ({ activity }) => {
    const getActivityIcon = (type) => {
      switch (type) {
        case 'user_registration': return Users
        case 'donation_created': return Package
        case 'verification_pending': return AlertTriangle
        case 'delivery_completed': return CheckCircle
        case 'request_created': return Clock
        case 'event_created': return Calendar
        default: return AlertTriangle
      }
    }

    const getActivityColor = (type) => {
      switch (type) {
        case 'user_registration': return 'text-blue-400'
        case 'donation_created': return 'text-green-400'
        case 'verification_pending': return 'text-yellow-400'
        case 'delivery_completed': return 'text-green-400'
        case 'request_created': return 'text-skyblue-400'
        case 'event_created': return 'text-purple-400'
        default: return 'text-skyblue-400'
      }
    }

    const Icon = getActivityIcon(activity.type)
    const colorClass = getActivityColor(activity.type)

    return (
      <div className="flex items-start gap-3 p-3 sm:p-4 hover:bg-navy-800/50 rounded-lg transition-colors">
        <div className={`p-2 rounded-lg bg-navy-800 ${colorClass} flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm break-words">{activity.message}</p>
          <p className="text-yellow-400 text-xs mt-1">{activity.timestamp}</p>
        </div>
      </div>
    )
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
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-yellow-300 text-xs sm:text-sm">Platform management and oversight</p>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics - Top 4 Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
                     <StatCard
             icon={Users}
             title="Total Users"
            value={stats.totalUsers?.toLocaleString() || '0'}
            description={`${stats.verifiedUsers || 0} verified, ${stats.unverifiedUsers || 0} pending`}
           />
           <StatCard
             icon={Package}
             title="Total Donations"
            value={stats.totalDonations?.toLocaleString() || '0'}
            description={`${stats.availableDonations || 0} available, ${stats.deliveredDonations || 0} delivered`}
             color="green"
           />
           <StatCard
             icon={AlertTriangle}
             title="Pending Requests"
            value={stats.pendingRequests?.toLocaleString() || '0'}
            description={`${stats.fulfilledRequests || 0} fulfilled`}
             color="yellow"
           />
          <StatCard
            icon={Calendar}
            title="Total Events"
            value={stats.totalEvents?.toLocaleString() || '0'}
            description={`${stats.completedEvents || 0} completed, ${stats.activeEvents || 0} active`}
            color="purple"
           />
        </motion.div>

        {/* Detailed Stats - Grouped by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Users Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-5 sm:p-6 border border-gray-600"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Users Overview</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Verified Donors</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.verifiedDonors?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-400" />
                  <span className="text-sm text-gray-300">Total Recipients</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.totalRecipients?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Total Volunteers</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.totalVolunteers?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Active Volunteers</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.activeVolunteers?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </motion.div>

          {/* Donations Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5 sm:p-6 border border-gray-600"
          style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Donations Overview</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Matched</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.matchedDonations?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Delivered</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.deliveredDonations?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">Available</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.availableDonations?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Fulfilled Requests</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.fulfilledRequests?.toLocaleString() || '0'}</span>
              </div>
             </div>
          </motion.div>

          {/* Events & Deliveries Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-5 sm:p-6 border border-gray-600"
            style={{backgroundColor: '#001a5c'}}
          >
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-400" />
                 </div>
              <h3 className="text-lg font-semibold text-white">Events & Deliveries</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Completed Events</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.completedEvents?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Upcoming Events</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.upcomingEvents?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">In Transit</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.inTransitDeliveries?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-navy-800/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">Completed Deliveries</span>
                </div>
                <span className="text-lg font-bold text-white">{stats.completedDeliveries?.toLocaleString() || '0'}</span>
              </div>
             </div>
          </motion.div>
        </div>

        {/* Analytics Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 sm:mt-8 space-y-6"
        >
          {/* Charts Grid Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Distribution Pie Chart */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={PieChart}
                title="User Distribution"
                data={chartData.userDistribution}
                columns={['name', 'value']}
                filename="user_distribution"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.userDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData.userDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#00237d', 
                        border: '2px solid #cdd74a',
                        borderRadius: '8px',
                        color: '#ffffff',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                      }}
                      labelStyle={{
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}
                      itemStyle={{
                        color: '#ffffff',
                        fontSize: '13px'
                      }}
                      formatter={(value, name) => [value, name]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No user data available</p>
              </div>
              )}
              </div>

            {/* Delivery Status - Custom Progress Bars Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Truck}
                title="Delivery Status"
                data={chartData.deliveryStatus}
                columns={['name', 'value']}
                filename="delivery_status"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.deliveryStatus.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {chartData.deliveryStatus.map((item, index) => {
                    const total = chartData.deliveryStatus.reduce((sum, i) => sum + i.value, 0)
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
                    const maxValue = Math.max(...chartData.deliveryStatus.map(i => i.value))
                    const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-gray-300 font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-yellow-400 font-bold">{item.value}</span>
                            <span className="text-gray-400 text-xs">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="relative h-6 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: item.color,
                              boxShadow: `0 0 10px ${item.color}40`
                            }}
                          />
                          <div 
                            className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                          >
                            {item.value > 0 && barWidth > 15 ? `${percentage}%` : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Total Deliveries</span>
                      <span className="text-yellow-400 font-bold text-lg">
                        {chartData.deliveryStatus.reduce((sum, item) => sum + item.value, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No delivery data available</p>
               </div>
              )}
            </div>
          </div>

          {/* Charts Grid Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Requests By Status Bar Chart */}
          <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={AlertTriangle}
                title="Requests By Status"
                data={chartData.requestsByStatus}
                columns={['name', 'value']}
                filename="requests_by_status"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.requestsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.requestsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No request data available</p>
              </div>
              )}
              </div>

            {/* Donations By Category Bar Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Package}
                title="Top Donation Categories"
                data={chartData.donationsByCategory}
                columns={['name', 'value']}
                filename="donations_by_category"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.donationsByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.donationsByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      type="number"
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      stroke="#94a3b8"
                      width={100}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No donation category data available</p>
               </div>
              )}
            </div>
          </div>

          {/* Charts Grid Row 3 - Full Width */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Activity Trends Line Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={TrendingUp}
                title="Activity Trends (Last 7 Days)"
                data={chartData.activityTrends}
                columns={['date', 'donations', 'requests']}
                filename="activity_trends"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.activityTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.activityTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="donations" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="Donations"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      name="Requests"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No activity data available</p>
                </div>
              )}
            </div>

            {/* Donations Over Time Area Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={BarChart3}
                title="Donations Over Time (Last 30 Days)"
                data={chartData.donationsOverTime}
                columns={['date', 'donations']}
                filename="donations_over_time"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.donationsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.donationsOverTime}>
                    <defs>
                      <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="donations" 
                      stroke="#8b5cf6" 
                      fillOpacity={1}
                      fill="url(#colorDonations)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No donation data available for the last 30 days</p>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid Row 4 - New Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Donations By Status Bar Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Package}
                title="Donations By Status"
                data={chartData.donationsByStatus}
                columns={['name', 'value']}
                filename="donations_by_status"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.donationsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.donationsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No donation status data available</p>
                </div>
              )}
            </div>

            {/* Events By Status Bar Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Calendar}
                title="Events By Status"
                data={chartData.eventsByStatus}
                columns={['name', 'value']}
                filename="events_by_status"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.eventsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.eventsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No event status data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid Row 5 - Time Series Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Events Over Time Area Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Calendar}
                title="Events Over Time (Last 30 Days)"
                data={chartData.eventsOverTime}
                columns={['date', 'events']}
                filename="events_over_time"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.eventsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.eventsOverTime}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#a855f7" 
                      fillOpacity={1}
                      fill="url(#colorEvents)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No event data available for the last 30 days</p>
                </div>
              )}
            </div>

            {/* User Registration Trends Area Chart */}
            <div className="card p-4 sm:p-6 border border-gray-600" style={{backgroundColor: '#001a5c'}}>
              <ChartHeader
                icon={Users}
                title="User Registration Trends (Last 30 Days)"
                data={chartData.userRegistrationTrends}
                columns={['date', 'users']}
                filename="user_registration_trends"
              />
              {chartsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" color="yellow" />
                </div>
              ) : chartData.userRegistrationTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.userRegistrationTrends}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#3b82f6" 
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No user registration data available for the last 30 days</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 sm:mt-8 card p-4 sm:p-6 border border-gray-600"
            style={{backgroundColor: '#001a5c'}}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center">
              <Clock className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0" />
              Recent Activity
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
               {recentActivity.length > 0 ? (
                 recentActivity.map((activity) => (
                   <ActivityItem key={activity.id} activity={activity} />
                 ))
               ) : (
                 <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-yellow-300 mx-auto mb-4" />
                  <p className="text-yellow-200">No recent activity</p>
                  <p className="text-yellow-300 text-sm">Activity will appear here as users interact with the platform</p>
                 </div>
               )}
             </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminDashboard 