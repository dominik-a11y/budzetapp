'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Błąd podczas logowania'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#ededed] mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] transition"
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[#ededed] mb-2"
        >
          Hasło
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] transition"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Logowanie...' : 'Zaloguj się'}
      </button>

      <p className="text-center text-[#999] text-sm">
        Nie masz konta?{' '}
        <Link
          href="/register"
          className="text-[#6c5ce7] hover:text-[#a29bfe] font-medium transition"
        >
          Zarejestruj się
        </Link>
      </p>
    </form>
  )
}
