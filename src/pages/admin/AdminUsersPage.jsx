import { useEffect, useState, useMemo, useCallback } from 'react'
import { Check, RefreshCw, Search, ShieldAlert, X } from 'lucide-react'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/useAuth'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from '../../services/auditLog'

const STATUS_LABEL = {
  approved: 'Aktif',
  rejected: 'Ditolak',
  pending: 'Menunggu',
}

const STATUS_STYLE = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
}

function RoleBadge({ role }) {
  const isAdminRole = role === 'admin'
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isAdminRole
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-blue-200 bg-blue-50 text-[#00529b]'
        }`}
    >
      {isAdminRole ? 'Administrator' : 'RM'}
    </span>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.pending
        }`}
    >
      {STATUS_LABEL[status] || 'Menunggu'}
    </span>
  )
}

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
      const { error: rpcErr } = await supabase.rpc('admin_approve_user', {
        p_user_id: userId,
        p_role: targetRole,
        p_status: targetStatus,
      })

      if (rpcErr) {
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
      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-rose-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-600">
            <ShieldAlert size={24} strokeWidth={2.2} />
          </div>
          <h2 className="mt-4 text-base font-bold tracking-tight text-slate-900">Akses Dibatasi</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Halaman Kelola Pengguna hanya dapat diakses oleh Administrator.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00529b]/70">
            KCP Iskandar Palembang
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
              Kelola Pengguna
            </h2>
            <span className="inline-flex items-center rounded-full border border-[#00529b]/20 bg-[#eaf3fb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#00529b]">
              {users.length} Akun
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Persetujuan pendaftaran dan pengaturan peran akses pengguna
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
          {error}
        </div>
      )}

      {/* ── Filter & Search Bar ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau email..."
            className="form-control pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50 p-0.5">
          {['Semua', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-semibold transition-all ${filterStatus === st
                ? 'bg-white text-[#00529b] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {st === 'pending' ? 'Menunggu' : st === 'approved' ? 'Disetujui' : st === 'rejected' ? 'Ditolak' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Table View ──────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Nama Pengguna</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Wilayah</th>
                <th className="px-5 py-2.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.map((u) => {
                const isBusy = updatingId === u.id
                return (
                  <tr key={u.id} className="group transition-colors hover:bg-[#f9fbfe]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                          {(u.nama || u.email || 'N').slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[12.5px] font-semibold text-slate-900">{u.nama || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {u.assigned_area || 'KCP Iskandar Palembang'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUpdateStatus(u.id, u.role || 'rm', 'approved')}
                            className="inline-flex items-center gap-1 rounded-md bg-[#00529b] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Check size={11} /> Setujui
                          </button>
                        )}

                        {u.role !== 'admin' ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Angkat ${u.nama || u.email} menjadi Admin?`)) {
                                handleUpdateStatus(u.id, 'admin', 'approved')
                              }
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Jadikan Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Ubah peran ${u.nama || u.email} menjadi RM?`)) {
                                handleUpdateStatus(u.id, 'rm', 'approved')
                              }
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ubah ke RM
                          </button>
                        )}

                        {u.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (window.confirm(`Tolak akun ${u.nama || u.email}?`)) {
                                handleUpdateStatus(u.id, u.role, 'rejected')
                              }
                            }}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <td colSpan="6" className="py-12 text-center">
                    <ShieldAlert className="mx-auto mb-1.5 size-8 text-slate-300" />
                    <p className="text-xs text-slate-400">Tidak ada pengguna yang sesuai dengan filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Card List View ───────────────────────────────────── */}
      <div className="block space-y-3 xl:hidden">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => {
            const isBusy = updatingId === u.id
            return (
              <div
                key={u.id}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300/80"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                        {(u.nama || u.email || 'N').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">{u.nama || '-'}</p>
                        <p className="truncate font-mono text-[10.5px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <StatusBadge status={u.status} />
                    <span className="text-slate-300">•</span>
                    <span>{u.assigned_area || 'KCP Iskandar Palembang'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                  {u.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleUpdateStatus(u.id, u.role || 'rm', 'approved')}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-[#00529b] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={13} /> Setujui
                    </button>
                  )}
                  {u.role !== 'admin' ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm(`Angkat ${u.nama || u.email} menjadi Admin?`)) {
                          handleUpdateStatus(u.id, 'admin', 'approved')
                        }
                      }}
                      className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Jadikan Admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm(`Ubah peran ${u.nama || u.email} menjadi RM?`)) {
                          handleUpdateStatus(u.id, 'rm', 'approved')
                        }
                      }}
                      className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ubah ke RM
                    </button>
                  )}
                  {u.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm(`Tolak akun ${u.nama || u.email}?`)) {
                          handleUpdateStatus(u.id, u.role, 'rejected')
                        }
                      }}
                      className="flex size-9.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Tolak akun"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        ) : !loading ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <ShieldAlert size={20} className="text-slate-300" />
            <p className="text-[11.5px] text-slate-400">Tidak ada pengguna yang sesuai dengan filter.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminUsersPage