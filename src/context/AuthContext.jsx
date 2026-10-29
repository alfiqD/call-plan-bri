import { useEffect, useState, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabase'
import { AuthContext } from './authContextInstance'
import { AUDIT_ACTIONS, ENTITY_TYPES, recordAuditEvent } from '../services/auditLog'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured())
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
          assigned_area: 'Bandung',
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
    if (!isSupabaseConfigured() || !supabase) {
      return undefined
    }

    let isMounted = true

    // Check initial active session
    supabase.auth.getSession().then(async ({ data: { session: initSession }, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Gagal membaca sesi Supabase:', error)
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      setSession(initSession)
      setUser(initSession?.user ?? null)

      if (initSession?.user) {
        const userProfile = await fetchProfile(initSession.user.id, initSession.user.email)
        if (isMounted) setProfile(userProfile)
      }
      if (isMounted) setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        const userProfile = await fetchProfile(newSession.user.id, newSession.user.email)
        if (isMounted) setProfile(userProfile)
      } else {
        if (isMounted) setProfile(null)
      }
      if (isMounted) setIsLoading(false)
    })

    // Realtime listener: Automatically detect when role or status is changed in Supabase profiles table
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

    // Refresh profile whenever user returns/focuses back from Supabase tab
    const handleWindowFocus = async () => {
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

  const signIn = async (email, password, rememberMe = true) => {
    setAuthError('')
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase belum dikonfigurasi. Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.')
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      setAuthError(error.message)
      throw error
    }

    if (!rememberMe && typeof window !== 'undefined') {
      window.sessionStorage.setItem('cp_session_only', '1')
    } else if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('cp_session_only')
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
    if (user) {
      void recordAuditEvent({
        action: AUDIT_ACTIONS.LOGOUT,
        entityType: ENTITY_TYPES.AUTH,
        entityId: user.id,
        actor: profile || { id: user.id, email: user.email, role: 'rm' },
      })
    }

    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('Gagal sign out:', error)
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('cp_session_only')
    }

    setSession(null)
    setUser(null)
    setProfile(null)
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
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
