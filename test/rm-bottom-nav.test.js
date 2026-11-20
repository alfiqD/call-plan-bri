import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('RM Mobile Bottom Navigation Logic', () => {
  const getBottomNavItems = ({
    activePage,
    mobileMapActive,
    isProfileOpen,
    urgentFollowUpCount = 0,
  }) => {
    return [
      {
        id: 'dashboard',
        label: 'Beranda',
        isActive: activePage === 'dashboard' && !mobileMapActive && !isProfileOpen,
      },
      {
        id: 'customers',
        label: 'Nasabah',
        isActive: activePage === 'customers' && !isProfileOpen,
      },
      {
        id: 'map',
        label: 'Peta',
        isActive: activePage === 'dashboard' && mobileMapActive && !isProfileOpen,
      },
      {
        id: 'schedule',
        label: 'Jadwal',
        isActive: activePage === 'schedule' && !isProfileOpen,
      },
      {
        id: 'profile',
        label: 'Profil',
        isActive: isProfileOpen,
        hasBadge: urgentFollowUpCount > 0,
      },
    ]
  }

  it('memiliki tepat 5 menu dalam urutan yang benar (Beranda, Nasabah, Peta, Jadwal, Profil)', () => {
    const items = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: false,
      isProfileOpen: false,
    })

    assert.equal(items.length, 5)
    assert.deepEqual(items.map((i) => i.label), ['Beranda', 'Nasabah', 'Peta', 'Jadwal', 'Profil'])
    assert.deepEqual(items.map((i) => i.id), ['dashboard', 'customers', 'map', 'schedule', 'profile'])
  })

  it('mengaktifkan menu Beranda saat berada di dashboard tanpa fokus peta', () => {
    const items = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: false,
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'dashboard')
    assert.equal(activeItem?.label, 'Beranda')
  })

  it('mengaktifkan menu Nasabah saat berada di halaman daftar nasabah', () => {
    const items = getBottomNavItems({
      activePage: 'customers',
      mobileMapActive: false,
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'customers')
    assert.equal(activeItem?.label, 'Nasabah')
  })

  it('mengaktifkan menu Peta saat mobileMapActive bernilai true', () => {
    const items = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: true,
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'map')
    assert.equal(activeItem?.label, 'Peta')
  })

  it('mengaktifkan menu Jadwal saat berada di halaman jadwal kunjungan', () => {
    const items = getBottomNavItems({
      activePage: 'schedule',
      mobileMapActive: false,
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'schedule')
    assert.equal(activeItem?.label, 'Jadwal')
  })

  it('mengaktifkan menu Profil dan menonaktifkan menu lain saat modal profil terbuka', () => {
    const items = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: false,
      isProfileOpen: true,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'profile')
    assert.equal(activeItem?.label, 'Profil')

    // Pastikan Beranda tidak aktif saat modal profil terbuka
    const berandaItem = items.find((i) => i.id === 'dashboard')
    assert.equal(berandaItem?.isActive, false)
  })

  it('menampilkan badge indikator pada menu Profil saat ada follow-up mendesak', () => {
    const itemsWithUrgent = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: false,
      isProfileOpen: false,
      urgentFollowUpCount: 3,
    })
    const profilItem = itemsWithUrgent.find((i) => i.id === 'profile')
    assert.equal(profilItem?.hasBadge, true)

    const itemsWithoutUrgent = getBottomNavItems({
      activePage: 'dashboard',
      mobileMapActive: false,
      isProfileOpen: false,
      urgentFollowUpCount: 0,
    })
    const profilNoBadge = itemsWithoutUrgent.find((i) => i.id === 'profile')
    assert.equal(profilNoBadge?.hasBadge, false)
  })

  it('memastikan bottom navigation hanya aktif untuk role RM, bukan Admin', () => {
    const shouldShowBottomNav = (role) => role === 'rm'
    assert.equal(shouldShowBottomNav('rm'), true)
    assert.equal(shouldShowBottomNav('admin'), false)
  })

  it('memformat informasi profil dan spesialisasi RM secara konsisten', () => {
    const formatRmProfileData = (profile, user) => {
      const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
      const displayEmail = profile?.email || user?.email || 'pegawai@bri.co.id'
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || 'RM'

      const jenisRm = profile?.jenis_rm
      const jenisRmLabel = jenisRm === 'RMFT'
        ? 'RM Funding & Transaction'
        : jenisRm === 'RMSME'
          ? 'RM Small Medium Enterprise'
          : 'Relationship Manager'

      return { displayName, displayEmail, initials, jenisRm, jenisRmLabel }
    }

    const ftProfile = formatRmProfileData(
      { nama: 'Budi Santoso', email: 'budi@bri.co.id', jenis_rm: 'RMFT' },
      null
    )
    assert.equal(ftProfile.displayName, 'Budi Santoso')
    assert.equal(ftProfile.initials, 'BS')
    assert.equal(ftProfile.jenisRmLabel, 'RM Funding & Transaction')

    const smeProfile = formatRmProfileData(
      { nama: 'Ahmad Fauzi', email: 'ahmad@bri.co.id', jenis_rm: 'RMSME' },
      null
    )
    assert.equal(smeProfile.jenisRmLabel, 'RM Small Medium Enterprise')

    const legacyProfile = formatRmProfileData(
      { nama: 'Siti Rahma', email: 'siti@bri.co.id', jenis_rm: null },
      null
    )
    assert.equal(legacyProfile.jenisRmLabel, 'Relationship Manager')
  })

  it('memetakan status akun secara dinamis dari Supabase (approved, pending, rejected, unknown)', () => {
    const getAccountStatusConfig = (status) => {
      return {
        approved: { label: 'Aktif (Disetujui)', className: 'text-emerald-700' },
        pending: { label: 'Menunggu Persetujuan', className: 'text-amber-700' },
        rejected: { label: 'Ditolak', className: 'text-rose-700' },
      }[status] || { label: 'Status Tidak Diketahui', className: 'text-slate-500' }
    }

    assert.deepEqual(getAccountStatusConfig('approved'), {
      label: 'Aktif (Disetujui)',
      className: 'text-emerald-700',
    })
    assert.deepEqual(getAccountStatusConfig('pending'), {
      label: 'Menunggu Persetujuan',
      className: 'text-amber-700',
    })
    assert.deepEqual(getAccountStatusConfig('rejected'), {
      label: 'Ditolak',
      className: 'text-rose-700',
    })
    assert.deepEqual(getAccountStatusConfig(null), {
      label: 'Status Tidak Diketahui',
      className: 'text-slate-500',
    })
    assert.deepEqual(getAccountStatusConfig(undefined), {
      label: 'Status Tidak Diketahui',
      className: 'text-slate-500',
    })
    assert.deepEqual(getAccountStatusConfig('random_status'), {
      label: 'Status Tidak Diketahui',
      className: 'text-slate-500',
    })
  })

  it('menggunakan assigned_area profil dinamis dengan fallback KCP Iskandar Palembang', () => {
    const resolveAssignedArea = (profile) => profile?.assigned_area || 'KCP Iskandar Palembang'

    assert.equal(resolveAssignedArea({ assigned_area: 'Palembang' }), 'Palembang')
    assert.equal(resolveAssignedArea({ assigned_area: 'KCP Sudirman' }), 'KCP Sudirman')
    assert.equal(resolveAssignedArea({ assigned_area: null }), 'KCP Iskandar Palembang')
    assert.equal(resolveAssignedArea({ assigned_area: '' }), 'KCP Iskandar Palembang')
    assert.equal(resolveAssignedArea(null), 'KCP Iskandar Palembang')
  })
})
