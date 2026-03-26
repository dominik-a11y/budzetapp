'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      setLoading(false)
      return
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setSuccess(true)
      setEmail('')
      setPassword('')
      setConfirmPassword('')

      // Optionally redirect after a delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Błąd podczas rejestracji'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-6">
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

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[#ededed] mb-2"
        >
          Potwierdź hasło
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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

      {success && (
        <div className="p-3 bg-[#00b894]/10 border border-[#00b894]/30 rounded-lg text-[#55efc4] text-sm">
          Konto zostało utworzone! Sprawdź swoją skrzynkę email, aby potwierdzić adres.
          Przekierowanie za 3 sekundy...
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
      </button>

      <p className="text-center text-[#999] text-sm">
        Masz już konto?{' '}
        <Link
          href="/login"
          className="text-[#6c5ce7] hover:text-[#a29bfe] font-medium transition"
        >
          Zaloguj się
        </Link>
      </p>
    </form>
  )
}
