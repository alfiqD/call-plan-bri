import { useEffect, useState, useMemo, useCallback } from 'react'
import { Check, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck, UserCheck, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/useAuth'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from '../../services/auditLog'

function AdminUsersPage({ onNotify, isAdmin, onNavigate }) {
  const { role, user, profile } = useAuth()
  const isUserAdmin = isAdmin ?? (role === 'admin')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(() => Boolean(supabase))
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const fetchUsers = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setUsers(data || [])
    } catch (err) {
      console.error('Gagal mengambil daftar pengguna:', err)
      setError(err.message || 'Gagal mengambil data pengguna.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    let isActive = true
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (!isActive) return
        if (fetchErr) setError(fetchErr.message)
        else setUsers(data || [])
        setLoading(false)
      })
    return () => { isActive = false }
  }, [])

  const handleUpdateStatus = async (userId, targetRole, targetStatus) => {
    setUpdatingId(userId)
    try {
      // First try trusted RPC admin_approve_user
      const { error: rpcErr } = await supabase.rpc('admin_approve_user', {
        p_user_id: userId,
        p_role: targetRole,
        p_status: targetStatus,
      })

      if (rpcErr) {
        // Fallback to direct update if RPC is not deployed yet
        const { error: directErr } = await supabase
          .from('profiles')
          .update({
            role: targetRole,
            status: targetStatus,
            approved_at: targetStatus === 'approved' ? new Date().toISOString() : null,
          })
          .eq('id', userId)

        if (directErr) throw directErr
      }

      setUsers((current) => current.map((u) => u.id === userId ? {
        ...u,
        role: targetRole,
        status: targetStatus,
      } : u))

      // Record audit log for user management actions
      const action = targetStatus === 'approved'
        ? AUDIT_ACTIONS.APPROVE_USER
        : targetStatus === 'rejected'
          ? AUDIT_ACTIONS.REJECT_USER
          : AUDIT_ACTIONS.UPDATE_ROLE
      void recordAuditEvent({
        action,
        entityType: ENTITY_TYPES.PROFILE,
        entityId: userId,
        actor: { id: user?.id, email: user?.email, nama: profile?.nama, role: profile?.role || 'admin' },
        details: { targetRole, targetStatus },
      })

      onNotify?.(`Pengguna berhasil diperbarui (${targetRole.toUpperCase()} · ${targetStatus})`)
    } catch (err) {
      console.error('Gagal memperbarui pengguna:', err)
      alert(err.message || 'Gagal mengubah status pengguna.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesStatus = filterStatus === 'Semua' || u.status === filterStatus
      const q = searchQuery.toLowerCase()
      const matchesSearch = (u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [users, filterStatus, searchQuery])

  if (!isUserAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
          <ShieldAlert size={32} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Akses Khusus Administrator</h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Halaman Pengelolaan Akun dan Otorisasi Role hanya dapat diakses oleh akun dengan wewenang <b>Administrator</b>. Akun Anda saat ini memiliki role <b>RM</b>.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('dashboard')}
          className="button-primary mx-auto mt-6"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pengelolaan Akses & Akun (Admin)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Setujui pendaftaran RM baru, tentukan role pengguna, dan kelola otorisasi operasional.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="button-secondary w-fit"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Segarkan Data
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700" role="alert">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email..."
            className="form-control pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {['Semua', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                filterStatus === st ? 'bg-white text-[#00529b] shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st === 'pending' ? 'Menunggu' : st === 'approved' ? 'Disetujui' : st === 'rejected' ? 'Ditolak' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table Container */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nama Pengguna</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status Persetujuan</th>
                <th className="px-4 py-3">Wilayah</th>
                <th className="px-5 py-3 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.map((u) => {
                const isBusy = updatingId === u.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {u.nama || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                          : 'bg-blue-50 text-[#00529b] ring-1 ring-blue-200'
                      }`}>
                        <Shield size={11} /> {u.role === 'admin' ? 'Administrator' : 'RM'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        u.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : u.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700 animate-pulse'
                      }`}>
                        {u.status === 'approved' ? <ShieldCheck size={12} /> : u.status === 'rejected' ? <ShieldAlert size={12} /> : <UserCheck size={12} />}
                        {u.status === 'approved' ? 'Aktif (Disetujui)' : u.status === 'rejected' ? 'Ditolak' : 'Menunggu Approval'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                      {u.assigned_area || 'KCP Iskandar Palembang'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(u.id, u.role || 'rm', 'approved')}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check size={12} /> Setujui Akun
                          </button>
                        )}

                        {u.role !== 'admin' ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Yakin ingin mengangkat ${u.nama || u.email} menjadi Admin?`)) {
                                handleUpdateStatus(u.id, 'admin', 'approved')
                              }
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            Jadikan Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Ubah hak akses ${u.nama || u.email} kembali menjadi RM?`)) {
                                handleUpdateStatus(u.id, 'rm', 'approved')
                              }
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          >
                            Ubah ke RM
                          </button>
                        )}

                        {u.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Tolak atau nonaktifkan akun ${u.nama || u.email}?`)) {
                                handleUpdateStatus(u.id, u.role, 'rejected')
                              }
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            aria-label="Tolak akun"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!filteredUsers.length && !loading && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Tidak ada pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
            const isBusy = updatingId === u.id
            return (
              <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{u.nama || '-'}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{u.assigned_area || 'KCP Iskandar Palembang'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    u.role === 'admin'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                      : 'bg-blue-50 text-[#00529b] ring-1 ring-blue-200'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'RM'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    u.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : u.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {u.status === 'approved' ? 'Aktif' : u.status === 'rejected' ? 'Ditolak' : 'Menunggu Approval'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {u.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(u.id, u.role || 'rm', 'approved')}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Setujui
                      </button>
                    )}
                    {u.role !== 'admin' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (window.confirm(`Yakin ingin mengangkat ${u.nama || u.email} menjadi Admin?`)) {
                            handleUpdateStatus(u.id, 'admin', 'approved')
                          }
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        Jadikan Admin
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (window.confirm(`Ubah hak akses ${u.nama || u.email} kembali menjadi RM?`)) {
                            handleUpdateStatus(u.id, 'rm', 'approved')
                          }
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                      >
                        Ubah ke RM
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : !loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400">
            Tidak ada pengguna yang sesuai dengan filter.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminUsersPage
