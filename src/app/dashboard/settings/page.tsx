'use client'

import { useState, useEffect } from 'react'
import { Download, LogOut, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSettings, updateSettings } from '@/lib/actions/settings'

export default function SettingsPage() {
  const [currentYear, setCurrentYear] = useState(2026)
  const [budgetStartDay, setBudgetStartDay] = useState(1)
  const [showBusinessBudget, setShowBusinessBudget] = useState(false)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        // Load user email
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setEmail(user.email)

        // Load settings from DB
        const settings = await getSettings()
        if (settings) {
          setCurrentYear(settings.current_year)
          setBudgetStartDay(settings.start_day_of_month)
          setShowBusinessBudget(settings.show_business)
        }
      } catch {
        // ignore load errors, use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase.auth])

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await updateSettings({
        current_year: currentYear,
        start_day_of_month: budgetStartDay,
        show_business: showBusinessBudget,
      })
      setMessage({ type: 'success', text: 'Ustawienia zostały zapisane' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Błąd podczas zapisywania',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportToExcel = async () => {
    try {
      const response = await fetch(`/api/export?year=${currentYear}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BudzetApp_${currentYear}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      setMessage({ type: 'error', text: 'Błąd podczas eksportu' })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6c5ce7] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-[#ededed]">Ustawienia</h1>
        <p className="text-[#999] mt-1">
          Skonfiguruj budżet i preferencje aplikacji
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-[#00b894]/10 border border-[#00b894]/30 text-[#55efc4]'
              : 'bg-[#e17055]/10 border border-[#e17055]/30 text-[#ff7675]'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Budget Settings */}
      <SettingsSection title="Budżet">
        <SettingItem>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Rok budżetowy
          </label>
          <input
            type="number"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
          />
          <p className="text-xs text-[#666] mt-1">
            Rok, dla którego zarządzasz budżetem
          </p>
        </SettingItem>

        <SettingItem>
          <label className="block text-sm font-medium text-[#ededed] mb-2">
            Dzień rozpoczęcia budżetu
          </label>
          <select
            value={budgetStartDay}
            onChange={(e) => setBudgetStartDay(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day} dzień miesiąca
              </option>
            ))}
          </select>
          <p className="text-xs text-[#666] mt-1">
            Od tego dnia zaczyna się nowy budżet miesięczny
          </p>
        </SettingItem>

        <SettingItem>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showBusinessBudget}
              onChange={(e) => setShowBusinessBudget(e.target.checked)}
              className="w-5 h-5 rounded accent-[#6c5ce7] cursor-pointer"
            />
            <span className="text-sm font-medium text-[#ededed]">
              Pokaż budżet biznesowy
            </span>
          </label>
          <p className="text-xs text-[#666] mt-2 ml-8">
            Włącz dodatkową ścieżkę dla wydatków związanych z biznesem
          </p>
        </SettingItem>
      </SettingsSection>

      {/* Export */}
      <SettingsSection title="Eksport danych">
        <SettingItem>
          <button
            onClick={handleExportToExcel}
            className="w-full flex items-center justify-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] border border-[#2a2a35] text-[#ededed] font-semibold py-2.5 rounded-lg transition"
          >
            <Download className="w-5 h-5" />
            <span>Eksportuj do Excela</span>
          </button>
          <p className="text-xs text-[#666] mt-2">
            Pobierz dane budżetu w formacie Excel dla roku {currentYear}
          </p>
        </SettingItem>
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Konto">
        <SettingItem>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#ededed]">
              Adres email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#666] focus:outline-none"
            />
          </div>
        </SettingItem>

        <SettingItem>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-[#e17055]/10 hover:bg-[#e17055]/20 border border-[#e17055]/30 text-[#ff7675] font-semibold py-2.5 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Wyloguj się</span>
          </button>
        </SettingItem>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex space-x-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
      <h2 className="text-lg font-semibold text-[#ededed] mb-6">{title}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

function SettingItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2a2a35] pb-6 last:border-0 last:pb-0">
      {children}
    </div>
  )
}
