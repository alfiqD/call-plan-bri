import { isSupabaseConfigured, supabase } from './supabase.js'
import { createId, localDateKey, readWorkspace, writeWorkspace } from '../data/workspace.js'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from './auditLog.js'

export const FOLLOW_UP_TYPES = [
  'Telepon',
  'WhatsApp',
  'Pertemuan/Kunjungan Ulang',
  'Melengkapi Dokumen',
  'Penawaran Produk',
  'Lainnya',
]

export const FOLLOW_UP_PRIORITIES = ['Rendah', 'Normal', 'Tinggi']
export const FOLLOW_UP_STATUSES = ['Belum Dilakukan', 'Selesai', 'Dibatalkan']

export function mapFollowUpFromDb(row) {
  return {
    id: String(row.id),
    customerId: String(row.nasabah_id),
    customerName: row.nasabahs?.nama || '',
    customerPicName: row.nasabahs?.nama_pic || '',
    customerPhone: row.nasabahs?.no_hp || '',
    customerAddress: row.nasabahs?.alamat || '',
    appointmentId: row.jadwal_kunjungan_id ? String(row.jadwal_kunjungan_id) : null,
    rmId: row.rm_id || null,
    rmName: row.profiles?.nama || '',
    date: row.tanggal_follow_up,
    time: row.waktu_follow_up ? row.waktu_follow_up.slice(0, 5) : '09:00',
    type: row.jenis_tindak_lanjut || 'Telepon',
    notes: row.catatan || '',
    priority: row.prioritas || 'Normal',
    status: row.status || 'Belum Dilakukan',
    resultNotes: row.hasil_tindak_lanjut || '',
    completedAt: row.completed_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }
}

/**
 * Calculate follow-up status flags based on current date
 */
export function getFollowUpStatusInfo(item, today = localDateKey()) {
  const isCompleted = item.status === 'Selesai'
  const isCanceled = item.status === 'Dibatalkan'
  const isPending = item.status === 'Belum Dilakukan'

  // Per rule: Completed or Canceled items are NEVER overdue or due today
  const isOverdue = isPending && item.date < today
  const isDueToday = isPending && item.date === today
  const isUpcoming = isPending && item.date > today

  return {
    isCompleted,
    isCanceled,
    isPending,
    isOverdue,
    isDueToday,
    isUpcoming,
  }
}

/**
 * Filter follow-up items by selected tab
 */
export function filterFollowUps(items = [], filter = 'Semua', today = localDateKey()) {
  return items.filter((item) => {
    const { isOverdue, isDueToday, isUpcoming, isCompleted } = getFollowUpStatusInfo(item, today)

    switch (filter) {
      case 'Hari Ini':
        return isDueToday
      case 'Mendatang':
        return isUpcoming
      case 'Terlambat':
        return isOverdue
      case 'Selesai':
        return isCompleted
      case 'Semua':
      default:
        return true
    }
  })
}

/**
 * Calculate badge counts and summary metrics
 */
export function calculateFollowUpMetrics(items = [], today = localDateKey()) {
  let todayCount = 0
  let overdueCount = 0
  let upcomingCount = 0
  let completedCount = 0
  let canceledCount = 0

  for (const item of items) {
    const { isOverdue, isDueToday, isUpcoming, isCompleted, isCanceled } = getFollowUpStatusInfo(item, today)
    if (isDueToday) todayCount += 1
    if (isOverdue) overdueCount += 1
    if (isUpcoming) upcomingCount += 1
    if (isCompleted) completedCount += 1
    if (isCanceled) canceledCount += 1
  }

  return {
    totalCount: items.length,
    todayCount,
    overdueCount,
    upcomingCount,
    completedCount,
    canceledCount,
    urgentCount: todayCount + overdueCount,
  }
}

// ============================================================================
// DATA ACCESS LAYER: SUPABASE & LOCALSTORAGE FALLBACK
// ============================================================================

export async function fetchFollowUps(filterUser = null) {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('follow_ups')
      .select(`
          *,
          nasabahs:nasabah_id (nama, nama_pic, no_hp, alamat),
          profiles:rm_id (nama)
        `)
      .order('tanggal_follow_up', { ascending: true })
      .order('waktu_follow_up', { ascending: true })

    if (error) {
      console.error('Gagal membaca follow-up dari Supabase:', error)
      throw new Error(error.message || 'Gagal memuat follow-up dari database.')
    }

    const list = (data || []).map(mapFollowUpFromDb)
    if (filterUser?.role === 'rm' && filterUser.id) {
      return list.filter((followUp) => followUp.rmId === filterUser.id)
    }
    return list
  }

  const { workspace } = readWorkspace()
  const list = workspace.followUps || []
  if (filterUser && filterUser.role === 'rm' && filterUser.id) {
    return list.filter((f) => !f.rmId || f.rmId === filterUser.id)
  }
  return list
}

export async function saveFollowUp(followUpData, currentUser = null) {
  const isExisting = Boolean(followUpData.id) && /^\d+$/.test(String(followUpData.id))

  if (isSupabaseConfigured() && supabase) {
    const authUser = (await supabase.auth.getUser()).data?.user
    const targetRmId = followUpData.rmId || authUser?.id

    const payload = {
      nasabah_id: Number(followUpData.customerId),
      jadwal_kunjungan_id: followUpData.appointmentId ? Number(followUpData.appointmentId) : null,
      tanggal_follow_up: followUpData.date,
      waktu_follow_up: followUpData.time ? (followUpData.time.length === 5 ? `${followUpData.time}:00` : followUpData.time) : '09:00:00',
      jenis_tindak_lanjut: followUpData.type,
      catatan: followUpData.notes.trim(),
      prioritas: followUpData.priority || 'Normal',
      status: followUpData.status || 'Belum Dilakukan',
      hasil_tindak_lanjut: followUpData.resultNotes ? followUpData.resultNotes.trim() : null,
      completed_at: followUpData.completedAt || null,
      updated_at: new Date().toISOString(),
    }

    const result = isExisting
      ? await supabase
        .from('follow_ups')
        .update(payload)
        .eq('id', followUpData.id)
        .select(`
            *,
            nasabahs:nasabah_id (nama, nama_pic, no_hp, alamat),
            profiles:rm_id (nama)
          `)
        .single()
      : await supabase
        .from('follow_ups')
        .insert([{
          ...payload,
          rm_id: targetRmId,
        }])
        .select(`
          *,
          nasabahs:nasabah_id (nama, nama_pic, no_hp, alamat),
          profiles:rm_id (nama)
        `)
        .single()

    if (result.error) {
      console.error('Gagal menyimpan follow-up ke Supabase:', result.error)
      throw new Error(result.error.message || 'Gagal menyimpan follow-up ke database.')
    }
    return mapFollowUpFromDb(result.data)
  }

  // Local storage fallback
  const { workspace } = readWorkspace()
  const nowIso = new Date().toISOString()
  const id = isExisting ? String(followUpData.id) : createId()

  const savedItem = {
    ...followUpData,
    id,
    customerId: String(followUpData.customerId),
    appointmentId: followUpData.appointmentId ? String(followUpData.appointmentId) : null,
    time: followUpData.time || '09:00',
    type: followUpData.type || 'Telepon',
    priority: followUpData.priority || 'Normal',
    status: followUpData.status || 'Belum Dilakukan',
    resultNotes: followUpData.resultNotes || '',
    completedAt: followUpData.completedAt || null,
    createdAt: followUpData.createdAt || nowIso,
    updatedAt: nowIso,
  }

  const existingIndex = (workspace.followUps || []).findIndex((f) => String(f.id) === String(id))
  const nextFollowUps = existingIndex >= 0
    ? workspace.followUps.map((f) => (String(f.id) === String(id) ? savedItem : f))
    : [savedItem, ...(workspace.followUps || [])]

  writeWorkspace({ ...workspace, followUps: nextFollowUps })

  void recordAuditEvent({
    action: isExisting ? AUDIT_ACTIONS.UPDATE_FOLLOW_UP : AUDIT_ACTIONS.CREATE_FOLLOW_UP,
    entityType: ENTITY_TYPES.FOLLOW_UP,
    entityId: savedItem.id,
    actor: currentUser,
    details: {
      customerId: savedItem.customerId,
      type: savedItem.type,
      date: savedItem.date,
      priority: savedItem.priority,
      status: savedItem.status,
    },
  })

  return savedItem
}

export async function completeFollowUp(id, resultNotes = '', currentUser = null) {
  const completedAt = new Date().toISOString()
  let completedItem = null

  if (isSupabaseConfigured() && supabase) {
    if (!/^\d+$/.test(String(id))) throw new Error('ID follow-up tidak valid untuk database.')
    const { data, error } = await supabase
      .from('follow_ups')
      .update({
        status: 'Selesai',
        hasil_tindak_lanjut: resultNotes.trim(),
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', id)
      .select(`
          *,
          nasabahs:nasabah_id (nama, nama_pic, no_hp, alamat),
          profiles:rm_id (nama)
        `)
      .single()

    if (error) {
      console.error('Gagal menyelesaikan follow-up di Supabase:', error)
      throw new Error(error.message || 'Gagal menyelesaikan follow-up di database.')
    }
    completedItem = mapFollowUpFromDb(data)
  } else {
    const { workspace } = readWorkspace()
    const nextFollowUps = (workspace.followUps || []).map((f) => {
      if (String(f.id) === String(id)) {
        completedItem = {
          ...f,
          status: 'Selesai',
          resultNotes: resultNotes.trim(),
          completedAt,
          updatedAt: completedAt,
        }
        return completedItem
      }
      return f
    })
    writeWorkspace({ ...workspace, followUps: nextFollowUps })
  }

  void recordAuditEvent({
    action: AUDIT_ACTIONS.COMPLETE_FOLLOW_UP,
    entityType: ENTITY_TYPES.FOLLOW_UP,
    entityId: id,
    actor: currentUser,
    details: { resultNotes: resultNotes.trim() },
  })

  return completedItem
}

export async function cancelFollowUp(id, currentUser = null) {
  const updatedAt = new Date().toISOString()
  let canceledItem = null

  if (isSupabaseConfigured() && supabase) {
    if (!/^\d+$/.test(String(id))) throw new Error('ID follow-up tidak valid untuk database.')
    const { data, error } = await supabase
      .from('follow_ups')
      .update({
        status: 'Dibatalkan',
        updated_at: updatedAt,
      })
      .eq('id', id)
      .select(`
          *,
          nasabahs:nasabah_id (nama, nama_pic, no_hp, alamat),
          profiles:rm_id (nama)
        `)
      .single()

    if (error) {
      console.error('Gagal membatalkan follow-up di Supabase:', error)
      throw new Error(error.message || 'Gagal membatalkan follow-up di database.')
    }
    canceledItem = mapFollowUpFromDb(data)
  } else {
    const { workspace } = readWorkspace()
    const nextFollowUps = (workspace.followUps || []).map((f) => {
      if (String(f.id) === String(id)) {
        canceledItem = {
          ...f,
          status: 'Dibatalkan',
          updatedAt,
        }
        return canceledItem
      }
      return f
    })
    writeWorkspace({ ...workspace, followUps: nextFollowUps })
  }

  void recordAuditEvent({
    action: AUDIT_ACTIONS.CANCEL_FOLLOW_UP,
    entityType: ENTITY_TYPES.FOLLOW_UP,
    entityId: id,
    actor: currentUser,
  })

  return canceledItem
}

export async function deleteFollowUp(id, currentUser = null) {
  if (isSupabaseConfigured() && supabase) {
    if (!/^\d+$/.test(String(id))) throw new Error('ID follow-up tidak valid untuk database.')
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Gagal menghapus follow-up di Supabase:', error)
      throw new Error(error.message || 'Gagal menghapus follow-up dari database.')
    }
  } else {
    const { workspace } = readWorkspace()
    const nextFollowUps = (workspace.followUps || []).filter((f) => String(f.id) !== String(id))
    writeWorkspace({ ...workspace, followUps: nextFollowUps })
  }

  void recordAuditEvent({
    action: AUDIT_ACTIONS.DELETE_FOLLOW_UP,
    entityType: ENTITY_TYPES.FOLLOW_UP,
    entityId: id,
    actor: currentUser,
  })
}
