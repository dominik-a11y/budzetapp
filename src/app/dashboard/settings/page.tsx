'use client'

import { useState } from 'react'
import { Download, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [currentYear, setCurrentYear] = useState(2026)
  const [budgetStartDay, setBudgetStartDay] = useState(1)
  const [showBusinessBudget, setShowBusinessBudget] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // TODO: Save settings to Supabase
      alert('Ustawienia zostały zapisane')
    } catch (err) {
      alert('Błąd podczas zapisywania ustawień')
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
    } catch (err) {
      alert('Błąd podczas eksportu')
      console.error(err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed]">Ustawienia</h1>
        <p className="text-[#999] mt-1">
          Skonfiguruj budżet i preferencje aplikacji
        </p>
      </div>

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
            Od tego dnia zacyna się nowy budżet miesięczny
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
            <span>Exportuj do Excela</span>
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
              value="user@example.com"
              disabled
              className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#666] focus:outline-none"
            />
            <p className="text-xs text-[#666] mt-1">
              Aby zmienić email, skontaktuj się z supportem
            </p>
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
  return <div className="border-b border-[#2a2a35] pb-6 last:border-0 last:pb-0">{children}</div>
}
