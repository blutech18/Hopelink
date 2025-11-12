/**
 * Supabase Storage Helper for secure file uploads
 * Replaces base64 storage with proper file storage
 */

import { supabase } from './supabase'

const STORAGE_BUCKET = 'user-uploads'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {string} type - 'image' or 'document'
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, type = 'image') {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  // Check file type
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes.map(t => t.split('/')[1]).join(', ')
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedExtensions}` }
  }

  // Additional validation: check file extension matches MIME type
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeExtension = file.type.split('/')[1]
  
  // Basic extension check (not foolproof, but helps)
  if (extension && !mimeExtension.includes(extension)) {
    console.warn('File extension does not match MIME type:', file.name, file.type)
  }

  return { valid: true }
}

/**
 * Upload file to Supabase Storage
 * @param {File} file - File to upload
 * @param {string} userId - User ID
 * @param {string} folder - Folder path (e.g., 'profile', 'donations', 'id-documents')
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadFile(file, userId, folder = 'profile', fileName = null) {
  // Validate file
  const validation = validateFile(file, folder.includes('id') ? 'document' : 'image')
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  try {
    // Generate file name if not provided
    if (!fileName) {
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 9)
      fileName = `${timestamp}-${random}.${fileExt}`
    }

    // Construct storage path: userId/folder/filename
    const storagePath = `${userId}/${folder}/${fileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
        contentType: file.type
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // For private buckets, we need to use signed URLs
    // Get signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 31536000) // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      // Fallback: try public URL (in case bucket becomes public later)
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath)
      return {
        url: publicUrl,
        path: storagePath
      }
    }

    return {
      url: signedUrlData.signedUrl,
      path: storagePath
    }
  } catch (error) {
    console.error('File upload error:', error)
    throw error
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} path - Storage path to delete
 * @returns {Promise<void>}
 */
export async function deleteFile(path) {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path])

    if (error) {
      console.error('File deletion error:', error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  } catch (error) {
    console.error('Delete file error:', error)
    throw error
  }
}

/**
 * Get file URL from storage path
 * @param {string} path - Storage path
 * @returns {Promise<string>} Signed URL (for private bucket)
 */
export async function getFileUrl(path) {
  if (!path) return null
  
  // If already a full URL (base64 or existing URL), return as is
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  try {
    // For private buckets, create signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 31536000) // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      // Fallback: try public URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path)
      return publicUrl
    }

    return signedUrlData.signedUrl
  } catch (error) {
    console.error('Error getting file URL:', error)
    // Fallback: try public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)
    return publicUrl
  }
}

/**
 * Check if a URL is a base64 data URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isBase64Url(url) {
  return url && (url.startsWith('data:') || url.startsWith('data:image'))
}

/**
 * Check if a URL is a storage path (not a full URL)
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isStoragePath(url) {
  return url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:') && url.includes('/')
}

/**
 * Get display URL for an image (handles base64, storage paths, and full URLs)
 * @param {string} imageUrl - Image URL, base64, or storage path
 * @returns {Promise<string>} Displayable URL
 */
export async function getDisplayUrl(imageUrl) {
  if (!imageUrl) return null
  
  // If base64, return as is
  if (isBase64Url(imageUrl)) {
    return imageUrl
  }
  
  // If full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // If storage path, get signed URL
  if (isStoragePath(imageUrl)) {
    return await getFileUrl(imageUrl)
  }
  
  // Default: return as is (might be avatar path like /avatar1.png)
  return imageUrl
}

/**
 * Convert base64 to File object (for migration from old system)
 * @param {string} base64String - Base64 string
 * @param {string} fileName - File name
 * @returns {File}
 */
export function base64ToFile(base64String, fileName = 'image.png') {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
  
  // Convert base64 to binary
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // Create blob and file
  const blob = new Blob([bytes], { type: 'image/png' })
  return new File([blob], fileName, { type: blob.type })
}

