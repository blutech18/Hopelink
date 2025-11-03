import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Gift, Package, MapPin, Calendar, AlertCircle, Heart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { db } from '../../lib/supabase'

const FulfillRequestPage = () => {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [request, setRequest] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    quantity: 1,
    delivery_mode: '',
    pickup_location: '',
    is_urgent: false
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        // fetch single request by id
        const requests = await db.getRequests({ id: requestId })
        const req = Array.isArray(requests) ? requests[0] : requests
        if (!req) {
          error('Request not found')
          navigate('/browse-requests')
          return
        }
        setRequest(req)
        // prefill form
        setForm(f => ({
          ...f,
          title: `For: ${req.title}`,
          description: `Donation to fulfill recipient request: ${req.title}`,
          category: req.category || '',
          quantity: req.quantity_needed || 1,
          pickup_location: profile?.address || ''
        }))
      } catch (e) {
        console.error(e)
        error('Failed to load request')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [requestId, navigate, error, profile?.address])

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!form.delivery_mode) {
      error('Please select delivery mode')
      return
    }
    try {
      setSubmitting(true)
      const donation = await db.createDonation({
        title: form.title,
        description: form.description,
        category: form.category,
        quantity: Number(form.quantity) || 1,
        pickup_location: form.pickup_location,
        delivery_mode: form.delivery_mode,
        is_urgent: !!form.is_urgent,
        status: 'available',
        donor_id: user.id,
        donation_destination: 'recipients',
        created_at: new Date().toISOString()
      })
      try {
        await db.createSmartMatch(requestId, donation.id)
      } catch (matchErr) {
        console.warn('Smart match failed, continuing:', matchErr)
      }
      success('Donation created and linked to the request!')
      navigate('/my-donations')
    } catch (err) {
      console.error(err)
      error(err.message || 'Failed to create donation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#00237d'}}>
        <div className="text-yellow-300">Loading...</div>
      </div>
    )
  }

  if (!request) return null

  return (
    <div className="min-h-screen py-6" style={{backgroundColor: '#00237d'}}>
      <div className="max-w-4xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <Heart className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Fulfill Request</h1>
          <p className="text-yellow-300 text-sm">Create a donation specifically for this request</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Request summary */}
          <div className="card p-5">
            <h2 className="text-white font-semibold mb-3">Request Details</h2>
            <div className="space-y-2 text-sm">
              <div className="text-white font-medium">{request.title}</div>
              <div className="text-yellow-300">{request.description || 'No description provided'}</div>
              <div className="flex items-center gap-2 text-yellow-300">
                <Package className="h-4 w-4" />
                <span>{request.category} • Needs: {request.quantity_needed}</span>
              </div>
              {request.location && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <MapPin className="h-4 w-4" />
                  <span>{request.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-yellow-300">
                <Calendar className="h-4 w-4" />
                <span>Posted: {new Date(request.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-yellow-400">
              <Link to="/browse-requests" className="underline hover:text-yellow-300">Back to Browse Requests</Link>
            </div>
          </div>

          {/* Donation form */}
          <form onSubmit={onSubmit} className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Donation Title *</label>
              <input name="title" value={form.title} onChange={onChange} className="input" placeholder="Donation title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={onChange} className="input h-28" placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Category *</label>
                <input name="category" value={form.category} onChange={onChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Quantity *</label>
                <input type="number" min="1" name="quantity" value={form.quantity} onChange={onChange} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Mode of Delivery *</label>
              <select name="delivery_mode" value={form.delivery_mode} onChange={onChange} className="input">
                <option value="">Select delivery mode</option>
                <option value="pickup">Self Pickup</option>
                <option value="volunteer">Volunteer Delivery</option>
                <option value="direct">Direct Delivery (by donor)</option>
              </select>
              <p className="text-xs text-yellow-400 mt-1">Choose how the recipient should receive this donation.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Pickup Location *</label>
              <input name="pickup_location" value={form.pickup_location} onChange={onChange} className="input" placeholder="Enter your pickup location" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={submitting} className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Create Donation and Link to Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FulfillRequestPage


