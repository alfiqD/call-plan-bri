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
