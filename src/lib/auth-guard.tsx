'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = loading
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    if (user === undefined) return // still loading

    const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === '/'

    if (!user && !isPublicPath) {
      router.replace('/login')
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.replace('/dashboard')
    }
  }, [user, pathname, router])

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Block protected pages for unauthenticated users
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === '/'
  if (!user && !isPublicPath) {
    return null
  }

  return <>{children}</>
}
