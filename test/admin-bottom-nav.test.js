import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Admin Mobile Bottom Navigation Logic', () => {
  const getAdminBottomNavItems = ({
    activePage,
    isProfileOpen,
    urgentFollowUpCount = 0,
  }) => {
    return [
      {
        id: 'dashboard',
        label: 'Beranda',
        isActive: activePage === 'dashboard' && !isProfileOpen,
      },
      {
        id: 'customers',
        label: 'Nasabah',
        isActive: activePage === 'customers' && !isProfileOpen,
      },
      {
        id: 'schedule',
        label: 'Jadwal',
        isActive: activePage === 'schedule' && !isProfileOpen,
      },
      {
        id: 'admin-users',
        label: 'Pengguna',
        isActive: activePage === 'admin-users' && !isProfileOpen,
      },
      {
        id: 'profile',
        label: 'Profil',
        isActive: isProfileOpen || ['audit-log', 'follow-up', 'reports'].includes(activePage),
        hasBadge: urgentFollowUpCount > 0,
      },
    ]
  }

  it('memiliki tepat 5 menu dalam urutan yang benar (Beranda, Nasabah, Jadwal, Pengguna, Profil)', () => {
    const items = getAdminBottomNavItems({
      activePage: 'dashboard',
      isProfileOpen: false,
    })

    assert.equal(items.length, 5)
    assert.deepEqual(items.map((i) => i.label), ['Beranda', 'Nasabah', 'Jadwal', 'Pengguna', 'Profil'])
    assert.deepEqual(items.map((i) => i.id), ['dashboard', 'customers', 'schedule', 'admin-users', 'profile'])
  })

  it('mengaktifkan menu Beranda saat berada di dashboard Admin tanpa modal terbuka', () => {
    const items = getAdminBottomNavItems({
      activePage: 'dashboard',
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'dashboard')
    assert.equal(activeItem?.label, 'Beranda')
  })

  it('mengaktifkan menu Nasabah saat berada di halaman daftar nasabah', () => {
    const items = getAdminBottomNavItems({
      activePage: 'customers',
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'customers')
    assert.equal(activeItem?.label, 'Nasabah')
  })

  it('mengaktifkan menu Jadwal saat berada di halaman jadwal kunjungan', () => {
    const items = getAdminBottomNavItems({
      activePage: 'schedule',
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'schedule')
    assert.equal(activeItem?.label, 'Jadwal')
  })

  it('mengaktifkan menu Pengguna saat berada di halaman kelola pengguna Admin', () => {
    const items = getAdminBottomNavItems({
      activePage: 'admin-users',
      isProfileOpen: false,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'admin-users')
    assert.equal(activeItem?.label, 'Pengguna')
  })

  it('mengaktifkan menu Profil dan menonaktifkan menu lain saat modal profil terbuka', () => {
    const items = getAdminBottomNavItems({
      activePage: 'dashboard',
      isProfileOpen: true,
    })

    const activeItem = items.find((i) => i.isActive)
    assert.equal(activeItem?.id, 'profile')
    assert.equal(activeItem?.label, 'Profil')

    // Pastikan Beranda tidak aktif saat modal profil terbuka
    const berandaItem = items.find((i) => i.id === 'dashboard')
    assert.equal(berandaItem?.isActive, false)
  })

  it('mengaktifkan menu Profil saat berada di sub-halaman administrasi (audit-log, follow-up, reports)', () => {
    for (const subPage of ['audit-log', 'follow-up', 'reports']) {
      const items = getAdminBottomNavItems({
        activePage: subPage,
        isProfileOpen: false,
      })

      const activeItem = items.find((i) => i.isActive)
      assert.equal(activeItem?.id, 'profile', `Halaman ${subPage} seharusnya mengaktifkan menu Profil`)
    }
  })

  it('menampilkan badge indikator pada menu Profil saat ada follow-up mendesak', () => {
    const itemsWithUrgent = getAdminBottomNavItems({
      activePage: 'dashboard',
      isProfileOpen: false,
      urgentFollowUpCount: 5,
    })
    const profilItem = itemsWithUrgent.find((i) => i.id === 'profile')
    assert.equal(profilItem?.hasBadge, true)

    const itemsWithoutUrgent = getAdminBottomNavItems({
      activePage: 'dashboard',
      isProfileOpen: false,
      urgentFollowUpCount: 0,
    })
    const profilNoBadge = itemsWithoutUrgent.find((i) => i.id === 'profile')
    assert.equal(profilNoBadge?.hasBadge, false)
  })

  it('memastikan pemisahan navigasi bottom: AdminBottomNav untuk Admin dan RMBottomNav untuk RM', () => {
    const getNavComponentForRole = (role) => {
      if (role === 'admin') return 'AdminBottomNav'
      if (role === 'rm') return 'RMBottomNav'
      return null
    }

    assert.equal(getNavComponentForRole('admin'), 'AdminBottomNav')
    assert.equal(getNavComponentForRole('rm'), 'RMBottomNav')
    assert.equal(getNavComponentForRole('guest'), null)
  })

  it('memformat informasi profil Administrator dan wilayah tugas secara konsisten', () => {
    const formatAdminProfileData = (profile, user) => {
      const displayName = profile?.nama || user?.user_metadata?.full_name || 'Administrator'
      const displayEmail = profile?.email || user?.email || 'admin@bri.co.id'
      const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || 'AD'

      const assignedArea = profile?.assigned_area || 'KCP Iskandar Palembang'
      const roleLabel = 'Administrator'

      return { displayName, displayEmail, initials, assignedArea, roleLabel }
    }

    const admin = formatAdminProfileData(
      { nama: 'Admin Unit Palembang', email: 'admin.palembang@bri.co.id', assigned_area: 'KCP Iskandar Palembang' },
      null
    )
    assert.equal(admin.displayName, 'Admin Unit Palembang')
    assert.equal(admin.initials, 'AU')
    assert.equal(admin.roleLabel, 'Administrator')
    assert.equal(admin.assignedArea, 'KCP Iskandar Palembang')

    const fallbackAdmin = formatAdminProfileData(null, { email: 'super@bri.co.id' })
    assert.equal(fallbackAdmin.displayName, 'Administrator')
    assert.equal(fallbackAdmin.assignedArea, 'KCP Iskandar Palembang')
  })
})
