import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudiante'
  const userEmail = user?.email || ''
  const userInstitucion = user?.user_metadata?.institucion || ''
  const userRol = user?.user_metadata?.rol || 'Estudiante'

  return { session, user, loading, userName, userEmail, userInstitucion, userRol }
}
