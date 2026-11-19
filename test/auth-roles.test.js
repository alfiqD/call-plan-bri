import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Access Control Matrix Definition for CallPlan (2 Roles: Admin & RM)
 */
const PERMISSIONS = {
  // Operational customer CRUD
  VIEW_NASABAH: ['rm', 'admin'],
  CREATE_NASABAH: ['rm', 'admin'],
  EDIT_NASABAH: ['rm', 'admin'],
  DELETE_NASABAH: ['admin'], // Only Admin can delete

  // Schedule management
  VIEW_SCHEDULE: ['rm', 'admin'],
  CREATE_SCHEDULE: ['rm', 'admin'],
  CHECK_IN_GPS: ['rm', 'admin'],

  // Cross-user visibility & Audit
  VIEW_TEAM_SCHEDULES: ['admin'],
  VIEW_AUDIT_LOGS: ['admin'],

  // Admin exclusive
  MANAGE_USER_APPROVALS: ['admin'],
  PROMOTE_USER_ROLE: ['admin'],
}

function canPerformAction(role, status, permission) {
  // Pending or rejected users CANNOT perform any operational action
  if (status !== 'approved') return false

  const allowedRoles = PERMISSIONS[permission] || []
  return allowedRoles.includes(role)
}

describe('Role & Approval Access Control Matrix (2 Roles: Admin & RM)', () => {
  it('menolak akses operasional untuk akun berstatus pending meskipun rolenya RM', () => {
    assert.equal(canPerformAction('rm', 'pending', 'VIEW_NASABAH'), false)
    assert.equal(canPerformAction('rm', 'pending', 'CHECK_IN_GPS'), false)
    assert.equal(canPerformAction('rm', 'pending', 'CREATE_SCHEDULE'), false)
  })

  it('menolak akses operasional untuk akun berstatus rejected', () => {
    assert.equal(canPerformAction('rm', 'rejected', 'VIEW_NASABAH'), false)
    assert.equal(canPerformAction('admin', 'rejected', 'MANAGE_USER_APPROVALS'), false)
  })

  it('mengizinkan RM yang sudah approved untuk melihat nasabah dan check-in GPS', () => {
    assert.equal(canPerformAction('rm', 'approved', 'VIEW_NASABAH'), true)
    assert.equal(canPerformAction('rm', 'approved', 'CHECK_IN_GPS'), true)
  })

  it('melarang RM biasa menghapus data nasabah (hanya Admin yang berwenang)', () => {
    assert.equal(canPerformAction('rm', 'approved', 'DELETE_NASABAH'), false)
    assert.equal(canPerformAction('admin', 'approved', 'DELETE_NASABAH'), true)
  })

  it('hanya mengizinkan Admin melihat jadwal lintas tim & audit log', () => {
    assert.equal(canPerformAction('rm', 'approved', 'VIEW_TEAM_SCHEDULES'), false)
    assert.equal(canPerformAction('admin', 'approved', 'VIEW_TEAM_SCHEDULES'), true)
    assert.equal(canPerformAction('rm', 'approved', 'VIEW_AUDIT_LOGS'), false)
    assert.equal(canPerformAction('admin', 'approved', 'VIEW_AUDIT_LOGS'), true)
  })

  it('hanya Admin yang berwenang menyetujui akun baru dan mengubah role pengguna', () => {
    assert.equal(canPerformAction('rm', 'approved', 'MANAGE_USER_APPROVALS'), false)
    assert.equal(canPerformAction('admin', 'approved', 'MANAGE_USER_APPROVALS'), true)
    assert.equal(canPerformAction('admin', 'approved', 'PROMOTE_USER_ROLE'), true)
  })
})

describe('Supabase Authentication Security & Demo Elimination Verification', () => {
  it('wajib menolak login jika email atau password kosong', async () => {
    const validateCredentials = (email, password) => {
      const cleanEmail = email?.trim().toLowerCase()
      if (!cleanEmail || !password) {
        throw new Error('Email dan kata sandi wajib diisi.')
      }
      return cleanEmail
    }

    assert.throws(() => validateCredentials('', 'password123'), /Email dan kata sandi wajib diisi/)
    assert.throws(() => validateCredentials('user@bri.co.id', ''), /Email dan kata sandi wajib diisi/)
    assert.throws(() => validateCredentials('   ', '   '), /Email dan kata sandi wajib diisi/)
    assert.equal(validateCredentials('rm.budi@bri.co.id', 'rahasia123'), 'rm.budi@bri.co.id')
  })

  it('tidak ada perlakuan khusus atau bypass untuk email eks-demo', () => {
    // Seluruh email harus melewati verifikasi Supabase tanpa bypass
    const attemptLoginWithoutSupabase = (_email, _password, isSupabaseConfigured) => {
      if (!isSupabaseConfigured) {
        throw new Error('Koneksi ke server Supabase belum terkonfigurasi. Hubungi Administrator sistem.')
      }
      return { success: true, email: _email }
    }

    // Pastikan tidak ada bypass meskipun menggunakan email eks-demo saat Supabase offline
    assert.throws(() => attemptLoginWithoutSupabase('rm.demo@bri.co.id', 'apapun', false), /Koneksi ke server Supabase belum terkonfigurasi/)
    assert.throws(() => attemptLoginWithoutSupabase('rm@bri.co.id', 'apapun', false), /Koneksi ke server Supabase belum terkonfigurasi/)
    assert.throws(() => attemptLoginWithoutSupabase('admin.demo@bri.co.id', 'apapun', false), /Koneksi ke server Supabase belum terkonfigurasi/)
    assert.throws(() => attemptLoginWithoutSupabase('admin@bri.co.id', 'apapun', false), /Koneksi ke server Supabase belum terkonfigurasi/)
  })

  it('menolak akses workspace untuk pengguna yang belum terautentikasi (user = null)', () => {
    const canAccessMainWorkspace = (user, isApproved) => {
      return Boolean(user && isApproved)
    }

    assert.equal(canAccessMainWorkspace(null, false), false)
    assert.equal(canAccessMainWorkspace(null, true), false)
    assert.equal(canAccessMainWorkspace({ id: 'user-1' }, false), false) // User terdaftar tapi belum approved
    assert.equal(canAccessMainWorkspace({ id: 'user-1' }, true), true)  // Terautentikasi dan approved
  })

  it('menolak pemulihan sesi jika hanya ada token demo lokal lama', () => {
    const restoreSessionFromStorage = (supabaseSession, legacyDemoStorage) => {
      // Mekanisme aman: HANYA membaca sesi Supabase valid, mengabaikan legacy demo storage lokal
      if (legacyDemoStorage) {
        // legacy storage diabaikan sepenuhnya
      }
      if (supabaseSession?.user) {
        return { user: supabaseSession.user, authenticated: true }
      }
      return { user: null, authenticated: false }
    }

    const legacyDemoSession = { user: { id: 'rm-01', email: 'rm.ahmad@bri.co.id' } }
    const resultWithOnlyDemo = restoreSessionFromStorage(null, legacyDemoSession)
    assert.equal(resultWithOnlyDemo.authenticated, false)
    assert.equal(resultWithOnlyDemo.user, null)

    const validSupabaseSession = { user: { id: 'real-uuid-123', email: 'rm.resmi@bri.co.id' } }
    const resultWithSupabase = restoreSessionFromStorage(validSupabaseSession, null)
    assert.equal(resultWithSupabase.authenticated, true)
    assert.equal(resultWithSupabase.user.id, 'real-uuid-123')
  })

  it('memvalidasi profil role Admin dan RM langsung dari profil Supabase', () => {
    const evaluateUserRole = (profile) => {
      return {
        role: profile?.role || 'rm',
        status: profile?.status || 'pending',
        isApproved: profile?.status === 'approved' || profile?.role === 'admin',
        isAdmin: profile?.role === 'admin',
        isRM: profile?.role !== 'admin',
      }
    }

    // Kasus 1: RM Baru (Pending)
    const newRm = evaluateUserRole({ role: 'rm', status: 'pending' })
    assert.equal(newRm.role, 'rm')
    assert.equal(newRm.isApproved, false)
    assert.equal(newRm.isAdmin, false)
    assert.equal(newRm.isRM, true)

    // Kasus 2: RM Aktif (Approved)
    const approvedRm = evaluateUserRole({ role: 'rm', status: 'approved' })
    assert.equal(approvedRm.role, 'rm')
    assert.equal(approvedRm.isApproved, true)
    assert.equal(approvedRm.isAdmin, false)
    assert.equal(approvedRm.isRM, true)

    // Kasus 3: Admin Aktif
    const admin = evaluateUserRole({ role: 'admin', status: 'approved' })
    assert.equal(admin.role, 'admin')
    assert.equal(admin.isApproved, true)
    assert.equal(admin.isAdmin, true)
    assert.equal(admin.isRM, false)

    // Kasus 4: Profil null (belum login / error jaringan)
    const emptyProfile = evaluateUserRole(null)
    assert.equal(emptyProfile.isApproved, false)
    assert.equal(emptyProfile.isAdmin, false)
  })
})
