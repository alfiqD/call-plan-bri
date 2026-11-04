import { useEffect, useState, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabase'
import { AuthContext } from './authContextInstance'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from '../services/auditLog'

const DEMO_STORAGE_KEY = 'call-plan-demo-session'

const DEMO_USERS = {
  rm: {
    user: {
      id: 'rm-01',
      email: 'rm.ahmad@bri.co.id',
      user_metadata: { full_name: 'Ahmad Fauzi' },
    },
    profile: {
      id: 'rm-01',
      nama: 'Ahmad Fauzi',
      email: 'rm.ahmad@bri.co.id',
      role: 'rm',
      status: 'approved',
      assigned_area: 'Palembang',
    },
  },
  admin: {
    user: {
      id: 'admin-01',
      email: 'admin.iskandar@bri.co.id',
      user_metadata: { full_name: 'Administrator Cabang' },
    },
    profile: {
      id: 'admin-01',
      nama: 'Administrator Cabang',
      email: 'admin.iskandar@bri.co.id',
      role: 'admin',
      status: 'approved',
      assigned_area: 'Palembang',
    },
  },
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const fetchProfile = useCallback(async (userId, userEmail) => {
    if (!supabase || !userId) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Row not found yet (e.g. trigger delay), fallback
        return {
          id: userId,
          nama: userEmail ? userEmail.split('@')[0] : 'Pengguna',
          email: userEmail,
          role: 'rm',
          status: 'pending',
          assigned_area: 'Palembang',
        }
      }
      if (error) {
        console.error('Gagal mengambil profil pengguna dari Supabase:', error)
        return null
      }
      return data
    } catch (err) {
      console.error('Error saat fetchProfile:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const updated = await fetchProfile(user.id, user.email)
    if (updated) setProfile(updated)
    setIsLoading(false)
  }, [fetchProfile, user])

  useEffect(() => {
    let isMounted = true

    // Check if there is a local demo session stored
    const checkDemoSession = () => {
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.user && parsed?.profile) {
              setSession({ access_token: 'demo-token', user: parsed.user })
              setUser(parsed.user)
              setProfile(parsed.profile)
              setIsLoading(false)
              return true
            }
          }
        }
      } catch (err) {
        console.warn('Gagal membaca demo session:', err)
      }
      return false
    }

    if (!isSupabaseConfigured() || !supabase) {
      checkDemoSession()
      if (isMounted) setIsLoading(false)
      return undefined
    }

    // Check initial active Supabase session
    supabase.auth.getSession().then(async ({ data: { session: initSession }, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Gagal membaca sesi Supabase:', error)
        setAuthError(error.message)
      }

      if (initSession?.user) {
        setSession(initSession)
        setUser(initSession.user)
        const userProfile = await fetchProfile(initSession.user.id, initSession.user.email)
        if (isMounted) setProfile(userProfile)
        if (isMounted) setIsLoading(false)
      } else {
        // If no active Supabase session, check if demo session exists
        const hasDemo = checkDemoSession()
        if (!hasDemo && isMounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setIsLoading(false)
        }
      }
    })

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return
      if (newSession?.user) {
        setSession(newSession)
        setUser(newSession.user)
        const userProfile = await fetchProfile(newSession.user.id, newSession.user.email)
        if (isMounted) setProfile(userProfile)
      } else {
        // If Supabase signed out, check if user switched to demo or is logged out
        const rawDemo = typeof window !== 'undefined' ? window.localStorage.getItem(DEMO_STORAGE_KEY) : null
        if (!rawDemo) {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      }
      if (isMounted) setIsLoading(false)
    })

    // Realtime listener for profiles table
    let profileChannel = null
    const setupRealtime = (userId) => {
      if (!userId || !supabase) return
      if (profileChannel) supabase.removeChannel(profileChannel)
      profileChannel = supabase
        .channel(`public-profiles-user-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (isMounted && payload.new) {
              setProfile(payload.new)
            }
          }
        )
        .subscribe()
    }

    const handleWindowFocus = async () => {
      if (!supabase) return
      const activeUser = (await supabase.auth.getSession())?.data?.session?.user
      if (activeUser && isMounted) {
        setupRealtime(activeUser.id)
        const updated = await fetchProfile(activeUser.id, activeUser.email)
        if (updated && isMounted) setProfile(updated)
      }
    }
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', handleWindowFocus)
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [fetchProfile])

  const signInDemo = (role = 'rm') => {
    const demo = DEMO_USERS[role] || DEMO_USERS.rm
    const dummySession = {
      access_token: 'demo-token',
      user: demo.user,
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ role, user: demo.user, profile: demo.profile }))
    }
    setSession(dummySession)
    setUser(demo.user)
    setProfile(demo.profile)
    setAuthError('')

    void recordAuditEvent({
      action: AUDIT_ACTIONS.LOGIN,
      entityType: ENTITY_TYPES.AUTH,
      entityId: demo.user.id,
      actor: demo.profile,
      details: {
        mode: 'demo',
        role,
        client: 'Web Internal Bank BRI',
      },
    })

    return { session: dummySession, user: demo.user }
  }

  const signIn = async (email, password, rememberMe = true) => {
    setAuthError('')
    const cleanEmail = email.trim().toLowerCase()

    // Shortcut: If testing with demo emails
    if (cleanEmail === 'rm.demo@bri.co.id' || cleanEmail === 'rm@bri.co.id') {
      return signInDemo('rm')
    }
    if (cleanEmail === 'admin.demo@bri.co.id' || cleanEmail === 'admin@bri.co.id') {
      return signInDemo('admin')
    }

    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase belum terhubung. Anda dapat menggunakan tombol Demo Login Cepat (RM / Admin) untuk menguji aplikasi.')
    }

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
      if (rememberMe) {
        window.sessionStorage.removeItem('cp_session_only')
      } else {
        window.sessionStorage.setItem('cp_session_only', '1')
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error) {
      setAuthError(error.message)
      throw error
    }

    // Clean any demo session if logging in with real Supabase
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
    }

    setSession(data.session)
    setUser(data.user)

    let loadedProfile = null
    if (data.user) {
      loadedProfile = await fetchProfile(data.user.id, data.user.email)
      setProfile(loadedProfile)
    }

    void recordAuditEvent({
      action: AUDIT_ACTIONS.LOGIN,
      entityType: ENTITY_TYPES.AUTH,
      entityId: data.user.id,
      actor: {
        id: data.user.id,
        email: data.user.email,
        nama: loadedProfile?.nama || data.user.email?.split('@')[0],
        role: loadedProfile?.role || 'rm',
      },
      details: {
        rememberMe,
        client: 'Web Internal Bank BRI',
      },
    })

    return data
  }

  const signUp = async (email, password, fullName) => {
    setAuthError('')
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase belum dikonfigurasi. Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.')
    }
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    })
    if (error) {
      setAuthError(error.message)
      throw error
    }
    return data
  }

  const signOut = async () => {
    try {
      if (user) {
        try {
          await recordAuditEvent({
            action: AUDIT_ACTIONS.LOGOUT,
            entityType: ENTITY_TYPES.AUTH,
            entityId: user.id,
            actor: profile || { id: user.id, email: user.email, role: 'rm' },
          })
        } catch (auditErr) {
          console.warn('Gagal mencatat audit log logout:', auditErr)
        }
      }

      if (supabase) {
        try {
          await supabase.auth.signOut()
        } catch (sbErr) {
          console.warn('Gagal sign out dari Supabase:', sbErr)
        }
      }
    } catch (err) {
      console.error('Error saat proses sign out:', err)
    } finally {
      // Clear all local auth artifacts and tokens
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem('cp_session_only')
          window.localStorage.removeItem(DEMO_STORAGE_KEY)
          for (const storage of [window.localStorage, window.sessionStorage]) {
            Object.keys(storage).forEach((key) => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                storage.removeItem(key)
              }
            })
          }
        } catch (storageErr) {
          console.warn('Gagal membersihkan storage saat logout:', storageErr)
        }
      }

      setSession(null)
      setUser(null)
      setProfile(null)
      setAuthError('')
    }
  }

  const resetPassword = async (email) => {
    if (!supabase) return
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return data
  }

  const value = {
    session,
    user,
    profile,
    role: profile?.role || 'rm',
    status: profile?.status || 'pending',
    isApproved: profile?.status === 'approved' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    isRM: profile?.role !== 'admin',
    isLoading,
    authError,
    isConfigured: isSupabaseConfigured(),
    signIn,
    signInDemo,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
