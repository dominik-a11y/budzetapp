'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, Plus, Loader2, X, Trash2 } from 'lucide-react'
import { getAccounts, createAccount, deleteAccount } from '@/lib/actions/accounts'
import type { Account, AccountType } from '@/types/budget'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Konto bieżące',
  savings: 'Konto oszczędnościowe',
  investment: 'Inwestycje',
  cash: 'Gotówka',
}

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: '🏦',
  savings: '🏪',
  investment: '📈',
  cash: '💵',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<AccountType>('checking')
  const [saving, setSaving] = useState(false)

  const loadAccounts = useCallback(async () => {
    try {
      setError(null)
      const data = await getAccounts()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania kont')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await createAccount({ name: newName.trim(), account_type: newType })
      setNewName('')
      setNewType('checking')
      setShowAdd(false)
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia konta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    try {
      await deleteAccount(id)
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania konta')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6c5ce7] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Konta</h1>
          <p className="text-[#999] mt-1">Zarządzaj swoimi kontami</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>Dodaj konto</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      {/* Add Account Form */}
      {showAdd && (
        <div className="bg-[#141418] rounded-lg border border-[#6c5ce7] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#ededed]">Nowe konto</h3>
            <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-[#2a2a35] rounded-lg">
              <X className="w-5 h-5 text-[#666]" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">Nazwa</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="np. Moje konto główne"
                className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#ededed] mb-2">Typ</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountType)}
                className="w-full px-4 py-2.5 bg-[#1e1e24] border border-[#2a2a35] rounded-lg text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Tworzenie...' : 'Utwórz konto'}
            </button>
          </div>
        </div>
      )}

      {/* Accounts */}
      {accounts.length === 0 && !showAdd ? (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-8 text-center">
          <Wallet className="w-12 h-12 text-[#666] mx-auto mb-4" />
          <p className="text-[#999] mb-2">Brak kont</p>
          <p className="text-[#666] text-sm">Dodaj swoje pierwsze konto, aby śledzić finanse.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 hover:border-[#6c5ce7] transition group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {ACCOUNT_TYPE_ICONS[account.account_type] || '💰'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#ededed]">{account.name}</h3>
                    <p className="text-xs text-[#666]">
                      {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 hover:bg-[#2a2a35] rounded-lg transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-[#e17055]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
