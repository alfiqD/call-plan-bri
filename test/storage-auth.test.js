import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseAuthStorage } from '../src/services/supabase.js'

function createMemoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  }
}

describe('Supabase remember-me storage', () => {
  it('persists tokens in local storage when remember-me is enabled', async () => {
    const localStorage = createMemoryStorage()
    const sessionStorage = createMemoryStorage()
    const authStorage = createSupabaseAuthStorage(localStorage, sessionStorage)

    await authStorage.setItem('auth-token', 'persistent')

    assert.equal(await authStorage.getItem('auth-token'), 'persistent')
    assert.equal(localStorage.getItem('auth-token'), 'persistent')
    assert.equal(sessionStorage.has('auth-token'), false)
  })

  it('keeps tokens in session storage when remember-me is disabled', async () => {
    const localStorage = createMemoryStorage({ 'auth-token': 'old-persistent' })
    const sessionStorage = createMemoryStorage({ cp_session_only: '1' })
    const authStorage = createSupabaseAuthStorage(localStorage, sessionStorage)

    await authStorage.setItem('auth-token', 'temporary')

    assert.equal(await authStorage.getItem('auth-token'), 'temporary')
    assert.equal(sessionStorage.getItem('auth-token'), 'temporary')
    assert.equal(localStorage.has('auth-token'), false)
  })

  it('removes tokens from both browser storage areas on sign-out', async () => {
    const localStorage = createMemoryStorage({ 'auth-token': 'persistent' })
    const sessionStorage = createMemoryStorage({ 'auth-token': 'temporary' })
    const authStorage = createSupabaseAuthStorage(localStorage, sessionStorage)

    await authStorage.removeItem('auth-token')

    assert.equal(localStorage.has('auth-token'), false)
    assert.equal(sessionStorage.has('auth-token'), false)
  })
})
