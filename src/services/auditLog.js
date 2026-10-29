import { isSupabaseConfigured, supabase } from './supabase.js'

const AUDIT_STORAGE_KEY = 'call-plan-audit-logs-v1'

/**
 * Audit Action Types Catalog
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',

  // Customer Management
  CREATE_NASABAH: 'CREATE_NASABAH',
  UPDATE_NASABAH: 'UPDATE_NASABAH',
  DELETE_NASABAH: 'DELETE_NASABAH',

  // Schedule Management
  CREATE_JADWAL: 'CREATE_JADWAL',
  UPDATE_JADWAL: 'UPDATE_JADWAL',
  DELETE_JADWAL: 'DELETE_JADWAL',

  // Field Visits
  CHECK_IN_VISIT: 'CHECK_IN_VISIT',
  RESCHEDULE_VISIT: 'RESCHEDULE_VISIT',
  UNMET_VISIT: 'UNMET_VISIT',

  // Follow-up Reminders
  CREATE_FOLLOW_UP: 'CREATE_FOLLOW_UP',
  UPDATE_FOLLOW_UP: 'UPDATE_FOLLOW_UP',
  COMPLETE_FOLLOW_UP: 'COMPLETE_FOLLOW_UP',
  CANCEL_FOLLOW_UP: 'CANCEL_FOLLOW_UP',
  DELETE_FOLLOW_UP: 'DELETE_FOLLOW_UP',

  // User Management
  APPROVE_USER: 'APPROVE_USER',
  UPDATE_ROLE: 'UPDATE_ROLE',
  REJECT_USER: 'REJECT_USER',
}

export const ENTITY_TYPES = {
  AUTH: 'auth',
  NASABAH: 'nasabah',
  JADWAL: 'jadwal_kunjungan',
  FOLLOW_UP: 'follow_up',
  PROFILE: 'profile',
}

/**
 * Sanitize metadata to prevent logging sensitive information
 * (passwords, tokens, full account numbers)
 */
export function sanitizeAuditDetails(details = {}) {
  if (!details || typeof details !== 'object') return {}
  const sanitized = {}

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase()

    // Omit sensitive authentication secrets entirely
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('cookie')
    ) {
      continue
    }

    // Mask bank account numbers: keep only last 4 digits
    if ((lowerKey.includes('rekening') || lowerKey.includes('account')) && typeof value === 'string') {
      const clean = value.replace(/\D/g, '')
      if (clean.length > 4) {
        sanitized[key] = `••••••••${clean.slice(-4)}`
        continue
      }
    }

    // Round GPS coordinates to reasonable precision (~11 meters)
    if (typeof value === 'number' && (lowerKey.includes('lat') || lowerKey.includes('lng') || lowerKey.includes('longitude') || lowerKey.includes('latitude'))) {
      sanitized[key] = Number(value.toFixed(4))
      continue
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditDetails(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// Memory cache for recent events to prevent duplicate audit logging within 2 seconds
const recentEvents = new Map()

/**
 * Record an audit log event
 */
export async function recordAuditEvent({
  action,
  entityType,
  entityId,
  actor,
  details = {},
}) {
  if (!action || !entityType) return null

  // Deduplication guard (prevents identical double logs within 2000ms)
  const dedupKey = `${action}_${entityType}_${entityId}_${actor?.id || 'anon'}`
  const now = Date.now()
  if (recentEvents.has(dedupKey) && now - recentEvents.get(dedupKey) < 2000) {
    return null
  }
  recentEvents.set(dedupKey, now)

  const sanitizedDetails = sanitizeAuditDetails(details)
  const logItem = {
    id: `audit-${now}-${Math.floor(Math.random() * 1000)}`,
    actorId: actor?.id || null,
    actorEmail: actor?.email || 'system@internal',
    actorName: actor?.nama || actor?.name || (actor?.role === 'admin' ? 'Administrator' : 'RM'),
    actorRole: actor?.role || 'rm',
    action,
    entityType,
    entityId: String(entityId || ''),
    details: sanitizedDetails,
    createdAt: new Date().toISOString(),
  }

  // 1. If Supabase is active, persist to PostgreSQL audit_logs table
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('record_audit_log', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: String(entityId || ''),
        p_metadata: sanitizedDetails,
      })

      if (error) {
        // Fallback to direct table insertion
        await supabase.from('audit_logs').insert([{
          actor_id: actor?.id || null,
          actor_email: actor?.email || null,
          actor_name: actor?.nama || actor?.name || null,
          actor_role: actor?.role || 'rm',
          action,
          entity_type: entityType,
          entity_id: String(entityId || ''),
          metadata: sanitizedDetails,
        }])
      }
      if (data?.id) logItem.id = String(data.id)
    } catch (dbErr) {
      console.warn('Audit log backend insertion failed; recording to local backup store:', dbErr)
    }
  }

  // 2. Always maintain local audit store for offline support and rapid queries
  writeLocalAuditLog(logItem)
  return logItem
}

/**
 * Read local audit logs
 */
export function readLocalAuditLogs() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY)
    if (!raw) {
      const seeds = createSeedAuditLogs()
      writeLocalAuditLogs(seeds)
      return seeds
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('Gagal membaca audit log dari localStorage:', err)
    return []
  }
}

function writeLocalAuditLogs(logs = []) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 300)))
  } catch (err) {
    console.warn('Gagal menyimpan audit log ke localStorage:', err)
  }
}

function writeLocalAuditLog(item) {
  const current = readLocalAuditLogs()
  const exists = current.some((log) => log.id === item.id)
  if (!exists) {
    writeLocalAuditLogs([item, ...current])
  }
}

/**
 * Fetch and filter audit logs with pagination
 */
export async function fetchAuditLogs({
  page = 1,
  pageSize = 15,
  search = '',
  action = 'Semua',
  entityType = 'Semua',
  actorId = 'Semua',
  startDate = '',
  endDate = '',
} = {}) {
  let logs = []

  // Try fetching from Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (action !== 'Semua') query = query.eq('action', action)
      if (entityType !== 'Semua') query = query.eq('entity_type', entityType)
      if (actorId !== 'Semua') query = query.eq('actor_id', actorId)
      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00Z`)
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59Z`)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (!error && data) {
        logs = data.map((row) => ({
          id: String(row.id),
          actorId: row.actor_id,
          actorEmail: row.actor_email || row.metadata?.actor_email || '',
          actorName: row.actor_name || row.metadata?.actor_name || 'Pengguna',
          actorRole: row.actor_role || row.metadata?.actor_role || 'rm',
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          details: row.metadata || {},
          createdAt: row.created_at,
        }))

        // If search query provided, filter in-memory if needed
        let filtered = logs
        if (search.trim()) {
          const q = search.toLowerCase()
          filtered = filtered.filter(
            (l) =>
              l.actorName.toLowerCase().includes(q) ||
              l.actorEmail.toLowerCase().includes(q) ||
              l.action.toLowerCase().includes(q) ||
              l.entityId.toLowerCase().includes(q)
          )
        }

        return {
          logs: filtered,
          totalCount: count || filtered.length,
          totalPages: Math.max(1, Math.ceil((count || filtered.length) / pageSize)),
          currentPage: page,
        }
      }
    } catch (err) {
      console.warn('Gagal membaca audit logs dari Supabase, beralih ke local log store:', err)
    }
  }

  // Fallback: Query local store
  let localLogs = readLocalAuditLogs()

  if (action !== 'Semua') {
    localLogs = localLogs.filter((l) => l.action === action)
  }
  if (entityType !== 'Semua') {
    localLogs = localLogs.filter((l) => l.entityType === entityType)
  }
  if (actorId !== 'Semua') {
    localLogs = localLogs.filter((l) => l.actorId === actorId)
  }
  if (startDate) {
    localLogs = localLogs.filter((l) => l.createdAt.slice(0, 10) >= startDate)
  }
  if (endDate) {
    localLogs = localLogs.filter((l) => l.createdAt.slice(0, 10) <= endDate)
  }
  if (search.trim()) {
    const q = search.toLowerCase()
    localLogs = localLogs.filter(
      (l) =>
        l.actorName.toLowerCase().includes(q) ||
        l.actorEmail.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
    )
  }

  const totalCount = localLogs.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startIndex = (page - 1) * pageSize
  const paginatedLogs = localLogs.slice(startIndex, startIndex + pageSize)

  return {
    logs: paginatedLogs,
    totalCount,
    totalPages,
    currentPage: page,
  }
}

/**
 * Seed initial audit logs for demonstration and testing
 */
function createSeedAuditLogs() {
  const d = new Date()
  const isoNow = d.toISOString()
  const yesterday = new Date(d.getTime() - 86400000).toISOString()
  const twoDaysAgo = new Date(d.getTime() - 86400000 * 2).toISOString()

  return [
    {
      id: 'audit-seed-1',
      actorId: 'rm-01',
      actorEmail: 'rm.ahmad@bri.co.id',
      actorName: 'Ahmad Fauzi',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.RESCHEDULE_VISIT,
      entityType: ENTITY_TYPES.JADWAL,
      entityId: '3',
      details: {
        customerName: 'Bambang Sudarsono',
        status: 'Reschedule',
        newDate: isoNow.slice(0, 10),
        newTime: '14:30',
        notes: 'Permintaan debitur diundur ke siang hari karena ada rapat dinas.',
      },
      createdAt: isoNow,
    },
    {
      id: 'audit-seed-1b',
      actorId: 'rm-02',
      actorEmail: 'rm.siti@bri.co.id',
      actorName: 'Siti Rahmawati',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.DELETE_JADWAL,
      entityType: ENTITY_TYPES.JADWAL,
      entityId: '5',
      details: {
        customerName: 'Hendro Gunawan',
        reason: 'Jadwal kunjungan dihapus atas konfirmasi debitur tidak berada di lokasi.',
      },
      createdAt: new Date(d.getTime() - 3600000 * 2).toISOString(),
    },
    {
      id: 'audit-seed-1c',
      actorId: 'rm-01',
      actorEmail: 'rm.ahmad@bri.co.id',
      actorName: 'Ahmad Fauzi',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.CHECK_IN_VISIT,
      entityType: ENTITY_TYPES.JADWAL,
      entityId: '1',
      details: {
        customerName: 'Budi Santoso',
        distanceMeters: 38.5,
        status: 'Selesai',
        checkInAt: isoNow,
      },
      createdAt: new Date(d.getTime() - 3600000 * 4).toISOString(),
    },
    {
      id: 'audit-seed-2',
      actorId: 'rm-01',
      actorEmail: 'rm.ahmad@bri.co.id',
      actorName: 'Ahmad Fauzi',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.CREATE_FOLLOW_UP,
      entityType: ENTITY_TYPES.FOLLOW_UP,
      entityId: '1',
      details: {
        customerName: 'Budi Santoso',
        type: 'Melengkapi Dokumen',
        priority: 'Tinggi',
        followUpDate: isoNow.slice(0, 10),
      },
      createdAt: isoNow,
    },
    {
      id: 'audit-seed-3',
      actorId: 'admin-01',
      actorEmail: 'admin.iskandar@bri.co.id',
      actorName: 'Administrator Cabang',
      actorRole: 'admin',
      action: AUDIT_ACTIONS.APPROVE_USER,
      entityType: ENTITY_TYPES.PROFILE,
      entityId: 'rm-02',
      details: {
        targetEmail: 'rm.siti@bri.co.id',
        assignedRole: 'rm',
        newStatus: 'approved',
      },
      createdAt: yesterday,
    },
    {
      id: 'audit-seed-4',
      actorId: 'rm-01',
      actorEmail: 'rm.ahmad@bri.co.id',
      actorName: 'Ahmad Fauzi',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.CREATE_NASABAH,
      entityType: ENTITY_TYPES.NASABAH,
      entityId: '2',
      details: {
        nama: 'Siti Rahmawati',
        kategori: 'Prospek',
        noRekening: '••••••••4455',
      },
      createdAt: twoDaysAgo,
    },
    {
      id: 'audit-seed-5',
      actorId: 'rm-01',
      actorEmail: 'rm.ahmad@bri.co.id',
      actorName: 'Ahmad Fauzi',
      actorRole: 'rm',
      action: AUDIT_ACTIONS.LOGIN,
      entityType: ENTITY_TYPES.AUTH,
      entityId: 'rm-01',
      details: {
        email: 'rm.ahmad@bri.co.id',
        client: 'Web Internal',
      },
      createdAt: twoDaysAgo,
    },
  ]
}
