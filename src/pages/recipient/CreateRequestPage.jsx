import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { 
  Heart, 
  Plus, 
  Minus, 
  Calendar, 
  MapPin, 
  AlertCircle,
  Save,
  X,
  Tag,
  FileText,
  Users,
  Clock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useNavigate, useLocation } from 'react-router-dom'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { db } from '../../lib/supabase'

const CreateRequestPage = () => {
  const { user, profile } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Check if we're in edit mode
  const editMode = location.state?.editMode || false
  const requestData = location.state?.requestData || null

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: '',
      quantity_needed: 1,
      urgency: 'medium',
      location: profile?.address || '',
      needed_by: '',
      delivery_mode: 'pickup',
      tags: [{ value: '' }]
    }
  })
  
  // Load edit data if in edit mode
  useEffect(() => {
    if (editMode && requestData) {
      const formData = {
        title: requestData.title || '',
        category: requestData.category || '',
        quantity_needed: requestData.quantity_needed || 1,
        description: requestData.description || '',
        urgency: requestData.urgency || 'medium',
        needed_by: requestData.needed_by || '',
        location: requestData.location || '',
        delivery_mode: requestData.delivery_mode || 'pickup',
        tags: requestData.tags?.length > 0 
          ? requestData.tags.map(tag => ({ value: tag })) 
          : [{ value: '' }]
      }
      reset(formData)
    }
  }, [editMode, requestData, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tags'
  })

  const watchedUrgency = watch('urgency')

  const categories = [
    'Food',
    'Clothing',
    'Medical Supplies',
    'Educational Materials',
    'Household Items',
    'Electronics',
    'Toys & Games',
    'Books',
    'Furniture',
    'Financial Assistance',
    'Transportation',
    'Other'
  ]

  const urgencyLevels = [
    { 
      value: 'low', 
      label: 'Low Priority', 
      description: 'Can wait for suitable donation',
      color: 'text-green-400'
    },
    { 
      value: 'medium', 
      label: 'Medium Priority', 
      description: 'Needed within a few weeks',
      color: 'text-yellow-400'
    },
    { 
      value: 'high', 
      label: 'High Priority', 
      description: 'Needed within a week',
      color: 'text-orange-400'
    },
    { 
      value: 'critical', 
      label: 'Critical', 
      description: 'Urgently needed within 1-2 days',
      color: 'text-red-400'
    }
  ]

  const onSubmit = async (data) => {
    if (!profile) {
      error('Please complete your profile first')
      return
    }

    try {
      setIsSubmitting(true)

      // Process tags
      const tags = data.tags
        .map(tag => tag.value?.trim())
        .filter(tag => tag && tag.length > 0)

      // Prepare request data
      const submitData = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        quantity_needed: parseInt(data.quantity_needed),
        urgency: data.urgency,
        location: data.location.trim(),
        needed_by: data.needed_by || null,
        delivery_mode: data.delivery_mode,
        tags: tags.length > 0 ? tags : null,
        requester_id: user.id
      }

      if (editMode && requestData) {
        await db.updateDonationRequest(requestData.id, submitData)
        success('Request updated successfully!')
      } else {
        await db.createDonationRequest(submitData)
        success('Request created successfully!')
      }
      
      navigate('/my-requests')
    } catch (err) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} request:`, err)
      error(err.message || `Failed to ${editMode ? 'update' : 'create'} request. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUrgencyInfo = (urgency) => {
    return urgencyLevels.find(level => level.value === urgency) || urgencyLevels[1]
  }

  const selectedUrgency = getUrgencyInfo(watchedUrgency)

  if (!profile) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Profile Required</h2>
          <p className="text-skyblue-400 mb-4">Please complete your profile to create requests.</p>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary"
          >
            Complete Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {editMode ? 'Edit Request' : 'Create Request'}
              </h1>
              <p className="text-skyblue-300">
                {editMode ? 'Update your request details' : 'Submit a request for items you need'}
              </p>
            </div>
            <button
              onClick={() => navigate('/my-requests')}
              className="btn btn-secondary flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <FileText className="h-5 w-5 text-skyblue-400 mr-2" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Request Title *
                </label>
                <input
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' },
                    maxLength: { value: 100, message: 'Title must be less than 100 characters' }
                  })}
                  className="input"
                  placeholder="e.g., Need warm clothes for family of 4"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-danger-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-danger-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quantity Needed *
                </label>
                <input
                  {...register('quantity_needed', {
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' },
                    max: { value: 1000, message: 'Quantity must be less than 1000' }
                  })}
                  type="number"
                  className="input"
                  placeholder="1"
                  min="1"
                  max="1000"
                />
                {errors.quantity_needed && (
                  <p className="mt-1 text-sm text-danger-600">{errors.quantity_needed.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  {...register('description', {
    

                    maxLength: { value: 1000, message: 'Description must be less than 1000 characters' }
                  })}
                  rows="4"
                  className="input resize-none"
                  placeholder="Describe what you need and why. Include any specific requirements, sizes, or conditions."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Priority and Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Clock className="h-5 w-5 text-skyblue-400 mr-2" />
              Priority & Timeline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Urgency Level *
                </label>
                <div className="space-y-3">
                  {urgencyLevels.map((level) => (
                    <label key={level.value} className="flex items-start cursor-pointer">
                      <input
                        {...register('urgency', { required: 'Urgency level is required' })}
                        type="radio"
                        value={level.value}
                        className="h-4 w-4 text-skyblue-600 focus:ring-skyblue-500 border-navy-600 mt-0.5"
                      />
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${level.color}`}>
                          {level.label}
                        </div>
                        <div className="text-xs text-skyblue-400">
                          {level.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.urgency && (
                  <p className="mt-1 text-sm text-danger-600">{errors.urgency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Needed By (Optional)
                </label>
                <input
                  {...register('needed_by')}
                  type="date"
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="mt-1 text-xs text-skyblue-400">
                  Leave empty if there's no specific deadline
                </p>

                {/* Selected Urgency Info */}
                <div className="mt-4 p-3 bg-navy-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle className={`h-4 w-4 ${selectedUrgency.color}`} />
                    <span className={`text-sm font-medium ${selectedUrgency.color}`}>
                      {selectedUrgency.label}
                    </span>
                  </div>
                  <p className="text-xs text-skyblue-400">
                    {selectedUrgency.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Location and Tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <MapPin className="h-5 w-5 text-skyblue-400 mr-2" />
              Location & Tags
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Pickup/Delivery Location *
                </label>
                <input
                  {...register('location', {
                    required: 'Location is required',
                    minLength: { value: 5, message: 'Location must be at least 5 characters' }
                  })}
                  className="input"
                  placeholder="Enter your address or pickup location"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-danger-600">{errors.location.message}</p>
                )}
                <p className="mt-1 text-xs text-skyblue-400">
                  This will help donors and volunteers coordinate delivery
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Preferred Delivery Mode *
                </label>
                <select
                  {...register('delivery_mode', {
                    required: 'Delivery mode is required'
                  })}
                  className="input"
                >
                  <option value="">Select delivery mode</option>
                  <option value="pickup">Self Pickup</option>
                  <option value="volunteer">Volunteer Delivery</option>
                  <option value="direct">Direct Delivery (by donor)</option>
                </select>
                {errors.delivery_mode && (
                  <p className="mt-1 text-sm text-danger-600">{errors.delivery_mode.message}</p>
                )}
                <p className="mt-1 text-xs text-skyblue-400">
                  Choose how you prefer to receive donations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tags (Optional)
                </label>
                <p className="text-xs text-skyblue-400 mb-3">
                  Add tags to help others find your request more easily
                </p>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <input
                          {...register(`tags.${index}.value`)}
                          className="input"
                          placeholder={`Tag ${index + 1}`}
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="btn btn-outline-danger p-2 flex-shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {fields.length < 5 && (
                    <button
                      type="button"
                      onClick={() => append({ value: '' })}
                      className="btn btn-secondary flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Submit Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex space-x-4"
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1 flex items-center justify-center"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editMode ? 'Update Request' : 'Create Request'}
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/my-requests')}
              className="btn btn-secondary flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  )
}

export default CreateRequestPage 