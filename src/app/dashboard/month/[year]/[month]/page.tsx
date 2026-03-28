'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Check, X, Loader2, Pencil, Building2, Home } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { getPlannedAmounts, upsertPlannedAmount } from '@/lib/actions/budgets'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategoryTotals } from '@/lib/actions/transactions'
import { getCategories, initializeDefaultCategories } from '@/lib/actions/categories'
import { getSettings } from '@/lib/actions/settings'
import type { Budget, CategoryWithChildren, Category, Transaction } from '@/types/budget'

const monthNames = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

interface CategoryGroupData {
  id: string
  name: string
  type: string
  planned: number
  actual: number
  subcategories: {
    id: string
    name: string
    planned: number
    actual: number
  }[]
}

export default function MonthPage() {
  const params = useParams()
  const router = useRouter()
  const monthNum = parseInt(params.month as string)
  const year = parseInt(params.year as string)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [plannedMap, setPlannedMap] = useState<Record<string, number>>({})
  const [catTotals, setCatTotals] = useState<Record<string, number>>({})

  // Budget type: home or business
  const [budgetType, setBudgetType] = useState<'home' | 'business'>('home')
  const [showBusinessToggle, setShowBusinessToggle] = useState(false)

  // Transaction form
  const [showAddTx, setShowAddTx] = useState(false)
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit transaction
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editTxCategoryId, setEditTxCategoryId] = useState('')
  const [editTxAmount, setEditTxAmount] = useState('')
  const [editTxDate, setEditTxDate] = useState('')
  const [editTxDescription, setEditTxDescription] = useState('')

  // Plan editing mode
  const [planEditMode, setPlanEditMode] = useState(false)
  const [planDraft, setPlanDraft] = useState<Record<string, string>>({})

  // Active tab for category type filter
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'savings'>('expense')

  const monthName = monthNames[monthNum - 1]

  const loadData = useCallback(async () => {
    try {
      setError(null)

      // Load settings to check if business toggle is enabled
      const settings = await getSettings()
      if (settings?.show_business) setShowBusinessToggle(true)

      // Init categories if needed
      let cats = await getCategories()
      if (cats.length === 0) {
        await initializeDefaultCategories()
        cats = await getCategories()
      }
      setCategories(cats)

      const b = await getOrCreateBudget(year, monthNum, budgetType)
      setBudget(b)

      const [txs, planned, totals] = await Promise.all([
        getTransactions(b.id),
        getPlannedAmounts(b.id),
        getCategoryTotals(b.id),
      ])

      setTransactions(txs)
      setCatTotals(totals)

      const pMap: Record<string, number> = {}
      for (const p of planned) {
        pMap[p.category_id] = Number(p.amount)
      }
      setPlannedMap(pMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania danych')
    } finally {
      setLoading(false)
    }
  }, [year, monthNum, budgetType])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  // Build category groups for the active tab
  const categoryGroups: CategoryGroupData[] = categories
    .filter(c => c.type === activeTab)
    .map(parent => {
      const subs = parent.children.map(child => ({
        id: child.id,
        name: child.name,
        planned: plannedMap[child.id] || 0,
        actual: catTotals[child.id] || 0,
      }))

      const plannedTotal = subs.reduce((s, c) => s + c.planned, 0) + (plannedMap[parent.id] || 0)
      const actualTotal = subs.reduce((s, c) => s + c.actual, 0) + (catTotals[parent.id] || 0)

      return {
        id: parent.id,
        name: parent.name,
        type: parent.type,
        planned: plannedTotal,
        actual: actualTotal,
        subcategories: subs,
      }
    })
    .filter(g => g.subcategories.length > 0 || g.planned > 0 || g.actual > 0)

  const totalPlanned = categoryGroups.reduce((s, g) => s + g.planned, 0)
  const totalActual = categoryGroups.reduce((s, g) => s + g.actual, 0)
  const remaining = totalPlanned - totalActual

  // Filter transactions for active tab
  const filteredTransactions = transactions.filter(t => {
    const cat = t.category as Category | undefined
    return cat?.type === activeTab
  })

  const navigateMonth = (delta: number) => {
    let newMonth = monthNum + delta
    let newYear = year
    if (newMonth < 1) { newMonth = 12; newYear-- }
    if (newMonth > 12) { newMonth = 1; newYear++ }
    router.push(`/dashboard/month/${newYear}/${newMonth}`)
  }

  // === Plan editing ===

  const startPlanEdit = () => {
    const draft: Record<string, string> = {}
    for (const group of categoryGroups) {
      for (const sub of group.subcategories) {
        draft[sub.id] = String(sub.planned || '')
      }
    }
    setPlanDraft(draft)
    setPlanEditMode(true)
  }

  const savePlanAll = async () => {
    if (!budget) return
    setSaving(true)
    try {
      for (const [categoryId, value] of Object.entries(planDraft)) {
        const amount = parseFloat(value) || 0
        const current = plannedMap[categoryId] || 0
        if (amount !== current) {
          await upsertPlannedAmount({
            budget_id: budget.id,
            category_id: categoryId,
            amount,
          })
        }
      }
      setPlanEditMode(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisywania planu')
    } finally {
      setSaving(false)
    }
  }

  // === Transaction handlers ===

  const handleAddTransaction = async () => {
    if (!budget || !txCategoryId || !txAmount || !txDate) return
    setSaving(true)
    try {
      await createTransaction({
        budget_id: budget.id,
        category_id: txCategoryId,
        amount: parseFloat(txAmount),
        date: txDate,
        description: txDescription || undefined,
      })
      setShowAddTx(false)
      setTxCategoryId('')
      setTxAmount('')
      setTxDate('')
      setTxDescription('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd dodawania transakcji')
    } finally {
      setSaving(false)
    }
  }

  const handleEditTransaction = async (id: string) => {
    if (!editTxAmount || !editTxDate || !editTxCategoryId) return
    setSaving(true)
    try {
      await updateTransaction(id, {
        category_id: editTxCategoryId,
        amount: parseFloat(editTxAmount),
        date: editTxDate,
        description: editTxDescription || undefined,
      })
      setEditingTxId(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd edycji transakcji')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    setSaving(true)
    try {
      await deleteTransaction(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania transakcji')
    } finally {
      setSaving(false)
    }
  }

  const startEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id)
    setEditTxCategoryId(tx.category_id)
    setEditTxAmount(String(tx.amount))
    setEditTxDate(tx.date)
    setEditTxDescription(tx.description || '')
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#ededed]">
            {monthName} {year}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-[#1e1e24] rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-[#ededed]" />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-[#1e1e24] rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-[#ededed]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      {/* Business/Private toggle */}
      {showBusinessToggle && (
        <div className="flex space-x-1 bg-[#141418] rounded-lg p-1 border border-[#2a2a35]">
          <button
            onClick={() => setBudgetType('home')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition ${
              budgetType === 'home'
                ? 'bg-[#00b894] text-white'
                : 'text-[#999] hover:text-[#ededed]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Prywatny</span>
          </button>
          <button
            onClick={() => setBudgetType('business')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition ${
              budgetType === 'business'
                ? 'bg-[#74b9ff] text-white'
                : 'text-[#999] hover:text-[#ededed]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Firmowy</span>
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex space-x-1 bg-[#141418] rounded-lg p-1 border border-[#2a2a35]">
        {(['expense', 'income', 'savings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-[#6c5ce7] text-white'
                : 'text-[#999] hover:text-[#ededed]'
            }`}
          >
            {tab === 'expense' ? 'Wydatki' : tab === 'income' ? 'Przychody' : 'Oszczędności'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard title="Plan" amount={totalPlanned} color="text-[#74b9ff]" />
        <SummaryCard title="Realizacja" amount={totalActual} color="text-[#a29bfe]" />
        <SummaryCard
          title="Pozostało"
          amount={remaining}
          color={remaining >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {/* Plan Edit Mode */}
      {planEditMode ? (
        <div className="bg-[#141418] rounded-lg border border-[#6c5ce7] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
            <h2 className="text-lg font-semibold text-[#ededed]">Edycja planu</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={savePlanAll}
                disabled={saving}
                className="flex items-center space-x-1.5 bg-[#00b894] hover:bg-[#00a381] text-white font-semibold px-4 py-2 rounded-lg transition text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Zapisz plan</span>
              </button>
              <button
                onClick={() => setPlanEditMode(false)}
                className="p-2 hover:bg-[#2a2a35] rounded-lg transition"
              >
                <X className="w-5 h-5 text-[#666]" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {categoryGroups.map(group => (
              <div key={group.id}>
                <h3 className="text-sm font-semibold text-[#ededed] mb-2">{group.name}</h3>
                <div className="space-y-2">
                  {group.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[#999] flex-1">{sub.name}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={planDraft[sub.id] || ''}
                          onChange={(e) => setPlanDraft(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="0"
                          className="w-28 px-3 py-1.5 bg-[#1e1e24] border border-[#2a2a35] rounded text-sm text-[#ededed] text-right focus:outline-none focus:border-[#6c5ce7]"
                        />
                        <span className="text-xs text-[#666]">zł</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Categories with planned amounts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#ededed]">Kategorie</h2>
              <button
                onClick={startPlanEdit}
                className="flex items-center space-x-1.5 text-[#6c5ce7] hover:text-[#a29bfe] transition text-sm font-medium"
              >
                <Pencil className="w-4 h-4" />
                <span>Edytuj plan</span>
              </button>
            </div>

            {categoryGroups.length === 0 && (
              <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-8 text-center">
                <p className="text-[#999] mb-2">Brak kategorii dla tego typu.</p>
                <p className="text-[#666] text-sm">Dodaj kategorie w zakładce Kategorie, aby móc ustawić plan i dodawać transakcje.</p>
              </div>
            )}

            {categoryGroups.map((group) => {
              const isOver = group.actual > group.planned && group.planned > 0
              const pct = group.planned > 0 ? Math.round((group.actual / group.planned) * 100) : 0

              return (
                <div
                  key={group.id}
                  className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#ededed]">{group.name}</h3>
                      {group.planned > 0 && (
                        <span className={`text-xs font-semibold ${isOver ? 'text-[#e17055]' : 'text-[#00b894]'}`}>
                          {pct}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm mb-2">
                      <span className="text-[#666]">Plan: {group.planned.toLocaleString('pl-PL')} zł</span>
                      <span className="text-[#666]">Realizacja: {group.actual.toLocaleString('pl-PL')} zł</span>
                    </div>
                    {group.planned > 0 && (
                      <div className="w-full bg-[#1e1e24] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${isOver ? 'bg-[#e17055]' : 'bg-[#00b894]'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Subcategories */}
                  {group.subcategories.length > 0 && (
                    <div className="border-t border-[#2a2a35] bg-[#1e1e24] p-4 space-y-3">
                      {group.subcategories.map(sub => {
                        const subPct = sub.planned > 0 ? Math.round((sub.actual / sub.planned) * 100) : 0
                        const subOver = sub.actual > sub.planned && sub.planned > 0

                        return (
                          <div key={sub.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#999]">{sub.name}</span>
                              <span className="text-xs text-[#666]">
                                {sub.planned > 0
                                  ? `${sub.actual.toLocaleString('pl-PL')} / ${sub.planned.toLocaleString('pl-PL')} zł`
                                  : sub.actual > 0
                                    ? `${sub.actual.toLocaleString('pl-PL')} zł`
                                    : '—'
                                }
                              </span>
                            </div>
                            {sub.planned > 0 && (
                              <div className="w-full bg-[#141418] rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${subOver ? 'bg-[#e17055]' : 'bg-[#00b894]'}`}
                                  style={{ width: `${Math.min(subPct, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Transactions Section */}
      {!planEditMode && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
            <h2 className="text-lg font-semibold text-[#ededed]">Transakcje</h2>
            <button
              onClick={() => {
                setShowAddTx(true)
                const today = new Date()
                const dd = String(today.getDate()).padStart(2, '0')
                const mm = String(today.getMonth() + 1).padStart(2, '0')
                setTxDate(`${year}-${mm}-${dd}`)
              }}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-3 py-2 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj</span>
            </button>
          </div>

          {/* Add Transaction Form */}
          {showAddTx && (
            <div className="p-4 border-b border-[#2a2a35] bg-[#1e1e24] space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#999] mb-1">Kategoria</label>
                  <select
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141418] border border-[#2a2a35] rounded-lg text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                  >
                    <option value="">Wybierz kategorię...</option>
                    {categories.filter(c => c.type === activeTab).map(parent => (
                      <optgroup key={parent.id} label={parent.name}>
                        {parent.children.map(child => (
                          <option key={child.id} value={child.id}>{child.name}</option>
                        ))}
                        {parent.children.length === 0 && (
                          <option value={parent.id}>{parent.name}</option>
                        )}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#999] mb-1">Kwota (zł)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#141418] border border-[#2a2a35] rounded-lg text-sm text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#999] mb-1">Data</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141418] border border-[#2a2a35] rounded-lg text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#999] mb-1">Opis (opcjonalny)</label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="np. Biedronka, zakupy"
                    className="w-full px-3 py-2 bg-[#141418] border border-[#2a2a35] rounded-lg text-sm text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7]"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddTransaction}
                  disabled={saving || !txCategoryId || !txAmount || !txDate}
                  className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
                </button>
                <button
                  onClick={() => setShowAddTx(false)}
                  className="px-4 py-2 text-[#999] hover:text-[#ededed] text-sm transition"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}

          {/* Transaction List */}
          <div className="divide-y divide-[#2a2a35]">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[#999] text-sm">Brak transakcji. Dodaj pierwszą!</p>
              </div>
            ) : (
              filteredTransactions.map(tx => {
                const cat = tx.category as Category | undefined
                const parentCat = categories.find(c =>
                  c.id === cat?.parent_id || c.children.some(ch => ch.id === cat?.id)
                )

                if (editingTxId === tx.id) {
                  return (
                    <div key={tx.id} className="p-4 bg-[#1e1e24] space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#999] mb-1">Kategoria</label>
                          <select
                            value={editTxCategoryId}
                            onChange={(e) => setEditTxCategoryId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#141418] border border-[#6c5ce7] rounded-lg text-sm text-[#ededed] focus:outline-none"
                          >
                            {categories.filter(c => c.type === activeTab).map(parent => (
                              <optgroup key={parent.id} label={parent.name}>
                                {parent.children.map(child => (
                                  <option key={child.id} value={child.id}>{child.name}</option>
                                ))}
                                {parent.children.length === 0 && (
                                  <option value={parent.id}>{parent.name}</option>
                                )}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#999] mb-1">Kwota</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editTxAmount}
                            onChange={(e) => setEditTxAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-[#141418] border border-[#6c5ce7] rounded-lg text-sm text-[#ededed] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#999] mb-1">Data</label>
                          <input
                            type="date"
                            value={editTxDate}
                            onChange={(e) => setEditTxDate(e.target.value)}
                            className="w-full px-3 py-2 bg-[#141418] border border-[#6c5ce7] rounded-lg text-sm text-[#ededed] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#999] mb-1">Opis</label>
                          <input
                            type="text"
                            value={editTxDescription}
                            onChange={(e) => setEditTxDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-[#141418] border border-[#6c5ce7] rounded-lg text-sm text-[#ededed] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditTransaction(tx.id)}
                          disabled={saving}
                          className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Zapisz'}
                        </button>
                        <button
                          onClick={() => setEditingTxId(null)}
                          className="px-4 py-2 text-[#999] hover:text-[#ededed] text-sm"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-[#1e1e24] transition group">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-medium text-[#ededed]">
                            {cat?.name || 'Brak kategorii'}
                          </p>
                          {parentCat && (
                            <p className="text-xs text-[#666]">{parentCat.name}</p>
                          )}
                        </div>
                      </div>
                      {tx.description && (
                        <p className="text-xs text-[#666] mt-1">{tx.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#ededed]">
                          {Number(tx.amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                        </p>
                        <p className="text-xs text-[#666]">
                          {new Date(tx.date).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => startEditTx(tx)}
                          className="p-1.5 hover:bg-[#2a2a35] rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#666]" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 hover:bg-[#2a2a35] rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#e17055]" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  amount,
  color,
}: {
  title: string
  amount: number
  color: string
}) {
  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4 md:p-6">
      <p className="text-xs md:text-sm font-medium text-[#999] mb-1 md:mb-2">{title}</p>
      <p className={`text-lg md:text-2xl font-bold ${color}`}>
        {amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
      </p>
    </div>
  )
}
