import { isSupabaseConfigured, supabase } from './supabase'
import { createId, readWorkspace, writeWorkspace } from '../data/workspace'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from './auditLog'

const appointmentStatusFromApi = {
  pending: 'Terjadwal',
  selesai: 'Selesai',
  reschedule: 'Reschedule',
  tidak_ditemui: 'Tidak ditemui',
}

export function mapCustomerFromDb(customer) {
  return {
    id: customer.id,
    name: customer.nama,
    phone: customer.no_hp,
    noRekening: customer.no_rekening || '',
    address: customer.alamat,
    type: customer.kategori || 'Prospek',
    loanStatus: customer.status_pinjaman || 'Belum ada pinjaman',
    latitude: customer.latitude === null || customer.latitude === undefined ? '' : String(customer.latitude),
    longitude: customer.longitude === null || customer.longitude === undefined ? '' : String(customer.longitude),
    createdByRmId: customer.created_by_rm_id || null,
  }
}

export function mapAppointmentFromDb(appointment) {
  return {
    id: appointment.id,
    customerId: appointment.nasabah_id,
    date: appointment.tanggal,
    time: appointment.waktu ? appointment.waktu.slice(0, 5) : '09:00',
    purpose: appointment.tujuan,
    priority: appointment.prioritas === 'tinggi' ? 'Tinggi' : 'Normal',
    status: appointmentStatusFromApi[appointment.status] || appointment.status,
    notes: appointment.catatan_hasil || '',
    evidence: '',
    checkInAt: appointment.check_in_at,
    checkInLatitude: appointment.check_in_latitude,
    checkInLongitude: appointment.check_in_longitude,
    checkInAccuracy: appointment.check_in_accuracy,
    checkInDistanceMeters: appointment.check_in_distance_meters,
  }
}

// ============================================================================
// SUPABASE POSTGRESQL DATA LAYER
// ============================================================================

async function fetchCustomersSupabase() {
  const { data, error } = await supabase
    .from('nasabahs')
    .select('*')
    .is('deleted_at', null)
    .order('nama', { ascending: true })

  if (error) {
    console.error('Error fetching nasabahs from Supabase:', error)
    throw new Error(error.message || 'Gagal memuat data nasabah dari database PostgreSQL.')
  }
  return (data || []).map(mapCustomerFromDb)
}

async function fetchAppointmentsSupabase() {
  const { data, error } = await supabase
    .from('jadwal_kunjungans')
    .select('*')
    .order('tanggal', { ascending: true })
    .order('waktu', { ascending: true })

  if (error) {
    console.error('Error fetching jadwal from Supabase:', error)
    throw new Error(error.message || 'Gagal memuat jadwal kunjungan dari database PostgreSQL.')
  }
  return (data || []).map(mapAppointmentFromDb)
}

async function saveCustomerSupabase(customer) {
  const payload = {
    nama: customer.name.trim(),
    alamat: customer.address.trim(),
    no_hp: customer.phone.trim(),
    no_rekening: customer.noRekening?.trim() || null,
    kategori: customer.type,
    status_pinjaman: customer.loanStatus,
    latitude: customer.latitude === '' || customer.latitude == null ? null : Number(customer.latitude),
    longitude: customer.longitude === '' || customer.longitude == null ? null : Number(customer.longitude),
    updated_at: new Date().toISOString(),
  }

  const isExisting = Boolean(customer.id) && /^\d+$/.test(String(customer.id))

  if (isExisting) {
    const { data, error } = await supabase
      .from('nasabahs')
      .update(payload)
      .eq('id', customer.id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Gagal memperbarui data nasabah.')
    return mapCustomerFromDb(data)
  }

  // Insert new
  const { data, error } = await supabase
    .from('nasabahs')
    .insert([{
      ...payload,
      created_by_rm_id: (await supabase.auth.getUser()).data?.user?.id ?? null,
    }])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Gagal menyimpan nasabah baru ke PostgreSQL.')
  return mapCustomerFromDb(data)
}

async function deleteCustomerSupabase(customerId) {
  // Soft delete for banking audit compliance
  const { error } = await supabase
    .from('nasabahs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', customerId)

  if (error) throw new Error(error.message || 'Gagal menonaktifkan nasabah.')
}

async function checkScheduleConflict(rmId, date, time, excludeId = null) {
  if (!supabase || !rmId) return
  let query = supabase
    .from('jadwal_kunjungans')
    .select('id, tanggal, waktu, status')
    .eq('rm_id', rmId)
    .eq('tanggal', date)
    .eq('waktu', time)
    .neq('status', 'tidak_ditemui')

  if (excludeId && /^\d+$/.test(String(excludeId))) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query
  if (error) return // soft failure, do not block if error checking conflict
  if (data && data.length > 0) {
    throw new Error(`Peringatan Jadwal Bentrok: Anda sudah memiliki agenda kunjungan pada ${date} pukul ${time}.`)
  }
}

async function saveAppointmentSupabase(appointment) {
  const authUser = (await supabase.auth.getUser()).data?.user
  const rmId = authUser?.id
  if (!rmId) throw new Error('Sesi pengguna tidak valid. Silakan login kembali.')

  // Check conflict
  await checkScheduleConflict(rmId, appointment.date, appointment.time, appointment.id)

  const payload = {
    nasabah_id: Number(appointment.customerId),
    tanggal: appointment.date,
    waktu: appointment.time.length === 5 ? `${appointment.time}:00` : appointment.time,
    tujuan: appointment.purpose,
    prioritas: appointment.priority === 'Tinggi' ? 'tinggi' : 'normal',
    updated_at: new Date().toISOString(),
  }

  const isExisting = Boolean(appointment.id) && /^\d+$/.test(String(appointment.id))

  if (isExisting) {
    const { data, error } = await supabase
      .from('jadwal_kunjungans')
      .update(payload)
      .eq('id', appointment.id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Gagal memperbarui jadwal kunjungan.')
    return mapAppointmentFromDb(data)
  }

  // Insert new
  const { data, error } = await supabase
    .from('jadwal_kunjungans')
    .insert([{
      ...payload,
      rm_id: rmId,
      status: 'pending',
    }])
    .select()
    .single()

  if (error) throw new Error(error.message || 'Gagal menambahkan jadwal kunjungan.')
  return mapAppointmentFromDb(data)
}

async function deleteAppointmentSupabase(appointmentId) {
  const { error } = await supabase
    .from('jadwal_kunjungans')
    .delete()
    .eq('id', appointmentId)

  if (error) throw new Error(error.message || 'Gagal menghapus jadwal kunjungan.')
}

async function submitVisitResultSupabase(appointment, { status, notes, newDate, newTime, coordinates }) {
  if (status === 'Selesai') {
    // Call server-side verified check_in_visit RPC
    const { data, error } = await supabase.rpc('check_in_visit', {
      p_jadwal_id: Number(appointment.id),
      p_lat: Number(coordinates.latitude),
      p_lng: Number(coordinates.longitude),
      p_notes: notes.trim(),
      p_accuracy: coordinates.accuracy ? Number(coordinates.accuracy) : null,
    })

    if (error) {
      console.error('Check-in RPC error:', error)
      throw new Error(error.message || 'Validasi check-in ditolak oleh server.')
    }

    return {
      ...appointment,
      status: 'Selesai',
      notes: notes.trim(),
      checkInAt: data?.data?.check_in_at || new Date().toISOString(),
      checkInLatitude: coordinates.latitude,
      checkInLongitude: coordinates.longitude,
      checkInAccuracy: coordinates.accuracy,
      checkInDistanceMeters: data?.data?.check_in_distance_meters,
    }
  }

  if (status === 'Reschedule') {
    // Call server-side reschedule_visit RPC
    const { error } = await supabase.rpc('reschedule_visit', {
      p_jadwal_id: Number(appointment.id),
      p_new_date: newDate,
      p_new_time: newTime.length === 5 ? `${newTime}:00` : newTime,
      p_notes: notes.trim(),
    })

    if (error) {
      // Fallback to direct update if RPC is not deployed yet
      const { error: directErr } = await supabase
        .from('jadwal_kunjungans')
        .update({
          status: 'reschedule',
          tanggal: newDate,
          waktu: newTime,
          catatan_hasil: notes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id)

      if (directErr) throw new Error(directErr.message || 'Gagal mengatur ulang jadwal.')
    }

    return {
      ...appointment,
      status: 'Reschedule',
      date: newDate,
      time: newTime,
      notes: notes.trim(),
    }
  }

  // Tidak ditemui
  const { error } = await supabase.rpc('mark_visit_unmet', {
    p_jadwal_id: Number(appointment.id),
    p_notes: notes.trim(),
  })

  if (error) {
    const { error: directErr } = await supabase
      .from('jadwal_kunjungans')
      .update({
        status: 'tidak_ditemui',
        catatan_hasil: notes.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    if (directErr) throw new Error(directErr.message || 'Gagal mencatat status tidak ditemui.')
  }

  return {
    ...appointment,
    status: 'Tidak ditemui',
    notes: notes.trim(),
  }
}

export async function fetchDashboardSummarySupabase(date) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('get_dashboard_summary', {
      p_date: date,
    })
    if (error) return null
    return data
  } catch {
    return null
  }
}


// ============================================================================
// PUBLIC UNIFIED SERVICE EXPORTS
// ============================================================================

function localHaversineMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000.0
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(1 - Math.min(1, Math.max(0, a))))
  return earthRadius * c
}

export async function fetchCustomers(filterUser = null) {
  let list = []
  if (isSupabaseConfigured() && supabase) {
    list = await fetchCustomersSupabase()
  } else {
    const { workspace } = readWorkspace()
    list = workspace.customers || []
  }
  if (filterUser && filterUser.role === 'rm' && filterUser.id) {
    return list.filter((c) => !c.createdByRmId || c.createdByRmId === filterUser.id)
  }
  return list
}

export async function fetchAppointments(filterUser = null) {
  let list = []
  if (isSupabaseConfigured() && supabase) {
    list = await fetchAppointmentsSupabase()
  } else {
    const { workspace } = readWorkspace()
    list = workspace.appointments || []
  }
  if (filterUser && filterUser.role === 'rm' && filterUser.id) {
    return list.filter((a) => !a.rmId || a.rmId === filterUser.id)
  }
  return list
}

export async function saveCustomer(customer, currentUser = null) {
  const isExisting = Boolean(customer.id)
  let saved
  if (isSupabaseConfigured() && supabase) {
    saved = await saveCustomerSupabase(customer)
  } else {
    const { workspace } = readWorkspace()
    const id = customer.id ? String(customer.id) : createId()
    const savedCustomer = {
      ...customer,
      id,
      createdByRmId: customer.createdByRmId || currentUser?.id || 'rm-01',
    }
    const exists = workspace.customers.some((c) => String(c.id) === id)
    const nextCustomers = exists
      ? workspace.customers.map((c) => String(c.id) === id ? savedCustomer : c)
      : [savedCustomer, ...workspace.customers]
    writeWorkspace({ ...workspace, customers: nextCustomers })
    saved = savedCustomer
  }

  void recordAuditEvent({
    action: isExisting ? AUDIT_ACTIONS.UPDATE_NASABAH : AUDIT_ACTIONS.CREATE_NASABAH,
    entityType: ENTITY_TYPES.NASABAH,
    entityId: saved.id,
    actor: currentUser,
    details: { nama: saved.name, type: saved.type, noRekening: saved.noRekening },
  })

  return saved
}

export async function deleteCustomer(customerId, currentUser = null) {
  if (isSupabaseConfigured() && supabase) {
    await deleteCustomerSupabase(customerId)
  } else {
    const { workspace } = readWorkspace()
    const nextCustomers = workspace.customers.filter((c) => String(c.id) !== String(customerId))
    writeWorkspace({ ...workspace, customers: nextCustomers })
  }

  void recordAuditEvent({
    action: AUDIT_ACTIONS.DELETE_NASABAH,
    entityType: ENTITY_TYPES.NASABAH,
    entityId: customerId,
    actor: currentUser,
  })
}

export async function saveAppointment(appointment, currentUser = null) {
  const isExisting = Boolean(appointment.id)
  let saved
  if (isSupabaseConfigured() && supabase) {
    saved = await saveAppointmentSupabase(appointment)
  } else {
    const { workspace } = readWorkspace()
    // Collision check
    const conflict = workspace.appointments.find((item) =>
      String(item.id) !== String(appointment.id) &&
      item.date === appointment.date &&
      item.time === appointment.time &&
      item.status !== 'Tidak ditemui'
    )
    if (conflict) {
      throw new Error(`Peringatan Jadwal Bentrok: Anda sudah memiliki agenda kunjungan pada ${appointment.date} pukul ${appointment.time}.`)
    }
    const id = appointment.id ? String(appointment.id) : createId()
    const savedAppointment = {
      ...appointment,
      id,
      status: appointment.status || 'Terjadwal',
      rmId: appointment.rmId || currentUser?.id || 'rm-01',
    }
    const exists = workspace.appointments.some((a) => String(a.id) === id)
    const nextAppointments = exists
      ? workspace.appointments.map((a) => String(a.id) === id ? savedAppointment : a)
      : [...workspace.appointments, savedAppointment]
    writeWorkspace({ ...workspace, appointments: nextAppointments })
    saved = savedAppointment
  }

  void recordAuditEvent({
    action: isExisting ? AUDIT_ACTIONS.UPDATE_JADWAL : AUDIT_ACTIONS.CREATE_JADWAL,
    entityType: ENTITY_TYPES.JADWAL,
    entityId: saved.id,
    actor: currentUser,
    details: { date: saved.date, time: saved.time, purpose: saved.purpose, customerId: saved.customerId },
  })

  return saved
}

export async function deleteAppointment(appointmentId, currentUser = null) {
  if (isSupabaseConfigured() && supabase) {
    await deleteAppointmentSupabase(appointmentId)
  } else {
    const { workspace } = readWorkspace()
    const nextAppointments = workspace.appointments.filter((a) => String(a.id) !== String(appointmentId))
    writeWorkspace({ ...workspace, appointments: nextAppointments })
  }

  void recordAuditEvent({
    action: AUDIT_ACTIONS.DELETE_JADWAL,
    entityType: ENTITY_TYPES.JADWAL,
    entityId: appointmentId,
    actor: currentUser,
  })
}

export async function submitVisitResult(appointment, visitData, currentUser = null) {
  let updatedAppointment = null

  if (isSupabaseConfigured() && supabase) {
    updatedAppointment = await submitVisitResultSupabase(appointment, visitData)
  } else {
    const { workspace } = readWorkspace()
    const { status, notes, newDate, newTime, coordinates } = visitData
    let distanceMeters = null

    if (status === 'Selesai') {
      const customer = workspace.customers.find((c) => String(c.id) === String(appointment.customerId))
      if (!customer?.latitude || !customer?.longitude) {
        throw new Error('Koordinat lokasi nasabah belum tersedia pada peta.')
      }
      distanceMeters = localHaversineMeters(
        Number(customer.latitude),
        Number(customer.longitude),
        Number(coordinates.latitude),
        Number(coordinates.longitude)
      )
      if (distanceMeters > 100) {
        throw new Error(`Check-in ditolak. Anda terdeteksi berjarak ${Math.round(distanceMeters)} meter dari titik nasabah (maksimal 100 meter).`)
      }
    }

    updatedAppointment = {
      ...appointment,
      status,
      notes: notes.trim(),
      ...(status === 'Selesai' ? {
        checkInAt: new Date().toISOString(),
        checkInLatitude: coordinates.latitude,
        checkInLongitude: coordinates.longitude,
        checkInAccuracy: coordinates.accuracy,
        checkInDistanceMeters: Math.round(distanceMeters),
      } : {}),
      ...(status === 'Reschedule' ? { date: newDate, time: newTime } : {}),
    }

    const nextAppointments = workspace.appointments.map((a) =>
      String(a.id) === String(appointment.id) ? updatedAppointment : a
    )
    writeWorkspace({ ...workspace, appointments: nextAppointments })
  }

  const actionMap = {
    Selesai: AUDIT_ACTIONS.CHECK_IN_VISIT,
    Reschedule: AUDIT_ACTIONS.RESCHEDULE_VISIT,
    'Tidak ditemui': AUDIT_ACTIONS.UNMET_VISIT,
  }

  void recordAuditEvent({
    action: actionMap[visitData.status] || AUDIT_ACTIONS.UPDATE_JADWAL,
    entityType: ENTITY_TYPES.JADWAL,
    entityId: appointment.id,
    actor: currentUser,
    details: {
      status: visitData.status,
      notes: visitData.notes,
      newDate: visitData.newDate,
      newTime: visitData.newTime,
      distanceMeters: updatedAppointment.checkInDistanceMeters,
    },
  })

  return updatedAppointment
}

export function validateAppointmentApiReady() {
  return true
}
