import React from 'react'

const Skeleton = ({ className = '', variant = 'default', animation = 'pulse' }) => {
  const baseClasses = 'bg-gray-700/30 rounded'
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }
  
  const variantClasses = {
    default: '',
    circle: 'rounded-full',
    text: 'h-4 w-full mb-2',
    title: 'h-8 w-3/4 mb-4',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-48 w-full rounded-lg',
    button: 'h-10 w-32 rounded-md'
  }
  
  return (
    <div 
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
    />
  )
}

export const SkeletonCard = () => (
  <div className="bg-navy-800 rounded-lg p-6 space-y-4">
    <div className="flex items-center space-x-4">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
    <div className="flex space-x-2">
      <Skeleton variant="button" />
      <Skeleton variant="button" />
    </div>
  </div>
)

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export const DashboardSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header Skeleton */}
    <div className="mb-8">
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-navy-800 rounded-lg p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
    
    {/* Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <SkeletonList count={3} />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <SkeletonList count={3} />
      </div>
    </div>
  </div>
)

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="bg-navy-800 rounded-lg overflow-hidden">
    {/* Table Header */}
    <div className="bg-navy-900 p-4 grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-4 w-24" />
      ))}
    </div>
    {/* Table Rows */}
    <div className="divide-y divide-navy-700">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((j) => (
            <Skeleton key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const FormSkeleton = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="bg-navy-800 rounded-lg p-6 space-y-6">
      <Skeleton className="h-8 w-48 mb-6" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex space-x-4 pt-4">
        <Skeleton variant="button" className="w-32" />
        <Skeleton variant="button" className="w-32" />
      </div>
    </div>
  </div>
)

export const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="bg-navy-800 rounded-lg p-6 mb-6">
      <div className="flex items-center space-x-6">
        <Skeleton variant="circle" className="h-24 w-24" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
    
    {/* Tabs */}
    <div className="flex space-x-4 mb-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-32" />
      ))}
    </div>
    
    {/* Content */}
    <div className="bg-navy-800 rounded-lg p-6 space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
)

export const EventsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="mb-8">
      <Skeleton className="h-10 w-64 mb-4" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    {/* Filters */}
    <div className="flex space-x-4 mb-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-40" />
    </div>
    
    {/* Events Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-navy-800 rounded-lg overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex space-x-2 pt-2">
              <Skeleton variant="button" className="w-24" />
              <Skeleton variant="button" className="w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const ListPageSkeleton = ({ title = "Loading" }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="mb-8 flex justify-between items-center">
      <div>
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton variant="button" className="w-40 h-10" />
    </div>
    
    {/* Filters/Tabs */}
    <div className="flex space-x-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-10 w-32" />
      ))}
    </div>
    
    {/* List Items */}
    <div className="space-y-4">
      <SkeletonList count={5} />
    </div>
  </div>
)

// Page-Specific Skeletons for exact page structure matching

export const DonorDashboardSkeleton = () => (
  <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96" />
      </div>
      
      {/* Stats Cards - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-navy-800 rounded-lg p-6 border border-gray-700">
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-10 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      
      {/* Quick Actions - 4 cards in grid */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-navy-800 rounded-lg p-6 border border-gray-700">
              <Skeleton variant="circle" className="h-12 w-12 mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-navy-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

export const VolunteerDashboardSkeleton = () => (
  <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96" />
      </div>
      
      {/* Stats Grid - Different layout for volunteers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-navy-800 rounded-lg p-6 border border-gray-700">
            <Skeleton className="h-5 w-28 mb-3" />
            <Skeleton className="h-10 w-16 mb-2" />
          </div>
        ))}
      </div>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Quick Actions */}
        <div>
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-navy-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center space-x-4">
                  <Skeleton variant="circle" className="h-12 w-12" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: Active Deliveries */}
        <div>
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-navy-800 rounded-lg p-4 border border-gray-700">
                <Skeleton className="h-6 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex space-x-2">
                  <Skeleton variant="button" className="w-32" />
                  <Skeleton variant="button" className="w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const MyDonationsSkeleton = () => (
  <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header with Button */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton variant="button" className="w-48 h-12" />
      </div>
      
      {/* Stats Summary - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-navy-800 rounded-lg p-4 border border-gray-700">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      
      {/* Filter Tabs */}
      <div className="flex space-x-4 mb-6">
        {['All', 'Available', 'Claimed', 'Completed'].map((_, i) => (
          <Skeleton key={i} className="h-10 w-28" />
        ))}
      </div>
      
      {/* Donations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-navy-800 rounded-lg overflow-hidden border border-gray-700">
            {/* Image */}
            <Skeleton className="h-48 w-full rounded-none" />
            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex space-x-2">
                <Skeleton variant="button" className="flex-1" />
                <Skeleton variant="button" className="w-10 h-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const BrowseRequestsSkeleton = () => (
  <div className="min-h-screen py-8" style={{backgroundColor: '#00237d'}}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      
      {/* Search and Filters */}
      <div className="bg-navy-800 rounded-lg p-6 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      
      {/* Matching Score Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Requests List */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-navy-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-16 w-16 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton variant="button" className="w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default Skeleton

