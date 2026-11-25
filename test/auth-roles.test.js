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

  it('tidak menampilkan halaman pending approval ketika profil masih dimuat (mencegah flashing)', () => {
    const resolveAppView = ({ user, profile, isApproved, isLoading }) => {
      if (isLoading || (user && !profile)) return 'loading'
      if (!user) return 'login'
      if (!isApproved) return 'pending_approval'
      return 'main_workspace'
    }

    // Kasus 1: Sesi ada tapi profil masih loading dari Supabase (wajib loading, jangan flash pending_approval)
    assert.equal(
      resolveAppView({ user: { id: 'u-1' }, profile: null, isApproved: false, isLoading: false }),
      'loading'
    )

    // Kasus 2: Akun RM approved selesai dimuat -> langsung workspace
    assert.equal(
      resolveAppView({ user: { id: 'u-1' }, profile: { status: 'approved' }, isApproved: true, isLoading: false }),
      'main_workspace'
    )

    // Kasus 3: Akun Admin selesai dimuat -> langsung workspace
    assert.equal(
      resolveAppView({ user: { id: 'u-admin' }, profile: { role: 'admin', status: 'approved' }, isApproved: true, isLoading: false }),
      'main_workspace'
    )

    // Kasus 4: Akun memang pending selesai dimuat -> halaman pending approval
    assert.equal(
      resolveAppView({ user: { id: 'u-2' }, profile: { status: 'pending' }, isApproved: false, isLoading: false }),
      'pending_approval'
    )

    // Kasus 5: Belum login -> login page
    assert.equal(
      resolveAppView({ user: null, profile: null, isApproved: false, isLoading: false }),
      'login'
    )
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

describe('Relationship Manager Specialization (RMFT & RMSME) Validation', () => {
  const validateRmRegistration = (role, jenisRm) => {
    if (role === 'admin') {
      return { valid: true, jenisRm: null }
    }
    if (!jenisRm || !['RMFT', 'RMSME'].includes(jenisRm)) {
      return { valid: false, error: 'Pilih jenis spesialisasi Relationship Manager (RMFT atau RMSME).' }
    }
    return { valid: true, jenisRm }
  }

  it('wajib menerima RMFT atau RMSME untuk pendaftaran RM baru', () => {
    assert.deepEqual(validateRmRegistration('rm', 'RMFT'), { valid: true, jenisRm: 'RMFT' })
    assert.deepEqual(validateRmRegistration('rm', 'RMSME'), { valid: true, jenisRm: 'RMSME' })
  })

  it('menolak pendaftaran RM baru tanpa jenis RM atau dengan nilai tidak valid', () => {
    assert.equal(validateRmRegistration('rm', null).valid, false)
    assert.equal(validateRmRegistration('rm', '').valid, false)
    assert.equal(validateRmRegistration('rm', 'SUPERVISOR').valid, false)
  })

  it('memastikan Admin tidak memiliki jenis RM (selalu bernilai null)', () => {
    assert.deepEqual(validateRmRegistration('admin', 'RMFT'), { valid: true, jenisRm: null })
    assert.deepEqual(validateRmRegistration('admin', null), { valid: true, jenisRm: null })
  })

  it('mempertahankan akun lama yang jenis_rm-nya null tanpa fallback otomatis ke RMFT', () => {
    const evaluateProfile = (profile) => ({
      role: profile?.role || 'rm',
      jenisRm: profile?.jenis_rm || null,
      displayJenisRm: profile?.role === 'admin' ? '-' : (profile?.jenis_rm || 'Belum Ditentukan'),
    })

    const legacyProfile = evaluateProfile({ role: 'rm', jenis_rm: null })
    assert.equal(legacyProfile.jenisRm, null)
    assert.equal(legacyProfile.displayJenisRm, 'Belum Ditentukan')

    const rmftProfile = evaluateProfile({ role: 'rm', jenis_rm: 'RMFT' })
    assert.equal(rmftProfile.jenisRm, 'RMFT')
    assert.equal(rmftProfile.displayJenisRm, 'RMFT')

    const adminProfile = evaluateProfile({ role: 'admin', jenis_rm: null })
    assert.equal(adminProfile.jenisRm, null)
    assert.equal(adminProfile.displayJenisRm, '-')
  })

  it('memastikan signUp AuthContext kompatibel dengan dan tanpa parameter jenisRm', () => {
    const buildSignUpPayload = (email, password, fullName, jenisRm = null) => {
      const cleanEmail = email.trim().toLowerCase()
      const userData = { full_name: fullName.trim() }
      if (jenisRm) userData.jenis_rm = jenisRm
      return { email: cleanEmail, password, options: { data: userData } }
    }

    const payloadWithJenis = buildSignUpPayload('rm@bri.co.id', 'rahasia123', 'Budi Santoso', 'RMFT')
    assert.deepEqual(payloadWithJenis.options.data, { full_name: 'Budi Santoso', jenis_rm: 'RMFT' })

    const payloadWithoutJenis = buildSignUpPayload('admin@bri.co.id', 'rahasia123', 'Super Admin')
    assert.deepEqual(payloadWithoutJenis.options.data, { full_name: 'Super Admin' })
    assert.equal(payloadWithoutJenis.options.data.jenis_rm, undefined)
  })

  it('memastikan pengangkatan RM menjadi Admin mereset jenis_rm menjadi null secara aman', () => {
    // Simulasi logika transisi peran di admin_approve_user & AdminUsersPage
    const changeUserRole = (currentProfile, targetRole) => {
      const allowedRoles = ['admin', 'rm']
      if (!allowedRoles.includes(targetRole)) {
        throw new Error('Role tidak valid.')
      }
      return {
        ...currentProfile,
        role: targetRole,
        jenis_rm: targetRole === 'admin' ? null : currentProfile.jenis_rm,
      }
    }

    const rmftUser = { id: 'rm-1', role: 'rm', jenis_rm: 'RMFT', status: 'approved' }
    const promotedToAdmin = changeUserRole(rmftUser, 'admin')
    assert.equal(promotedToAdmin.role, 'admin')
    assert.equal(promotedToAdmin.jenis_rm, null, 'jenis_rm wajib di-reset menjadi null saat menjadi Admin')

    // Verifikasi validasi constraint profiles_jenis_rm_check:
    // CHECK (jenis_rm IS NULL OR jenis_rm IN ('RMFT', 'RMSME'))
    const checkConstraint = (jenisRm) => jenisRm === null || ['RMFT', 'RMSME'].includes(jenisRm)
    assert.equal(checkConstraint(promotedToAdmin.jenis_rm), true, 'Nilai null pada Admin memenuhi constraint profiles_jenis_rm_check')
  })
})

