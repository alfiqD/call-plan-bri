import { isSupabaseConfigured, supabase } from './supabase.js'

export const MAX_PHOTO_BYTES = 1024 * 1024 // 1 MB
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

/**
 * Validates photo file size and MIME type.
 */
export function validatePhotoFile(file) {
  if (!file) {
    return { valid: false, error: 'File foto belum dipilih.' }
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { valid: false, error: 'Format file tidak didukung. Harap pilih gambar dengan format JPG, PNG, atau WEBP.' }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `Ukuran file foto (${sizeInMb} MB) melebihi batas maksimal 1 MB. Silakan kompres atau pilih foto lain.`,
    }
  }
  return { valid: true }
}

/**
 * Converts a browser File object to a Base64 Data URL string.
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Format file foto gagal dikonversi.'))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file foto dari perangkat.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads a visit evidence photo (either 'lokasi' or 'dokumentasi').
 * Uses Supabase Storage when configured; local/demo mode stores a Data URL.
 */
export async function uploadVisitPhoto(file, appointmentId, photoType = 'dokumentasi') {
  const validation = validatePhotoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const extension = file.name?.split('.').pop()?.toLowerCase() || 'jpg'
      const sanitizedAppId = String(appointmentId).replace(/[^\w-]/g, '')
      const fileName = `${photoType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`
      const filePath = `appointments/${sanitizedAppId}/${fileName}`

      const { data, error } = await supabase.storage
        .from('visit-evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        })

      if (error) throw error
      if (!data?.path) throw new Error('Supabase tidak mengembalikan lokasi penyimpanan foto.')

      const { data: publicUrlData } = supabase.storage
        .from('visit-evidence')
        .getPublicUrl(data.path)

      if (!publicUrlData?.publicUrl) throw new Error('URL foto yang tersimpan tidak tersedia.')
      return publicUrlData.publicUrl
    } catch (storageErr) {
      console.error('Gagal mengunggah dokumentasi ke Supabase Storage:', storageErr)
      throw new Error(storageErr instanceof Error
        ? `Foto gagal diunggah ke penyimpanan: ${storageErr.message}`
        : 'Foto gagal diunggah ke penyimpanan Supabase.', { cause: storageErr })
    }
  }

  return await readFileAsDataUrl(file)
}
