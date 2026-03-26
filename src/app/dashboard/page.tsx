'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Loader2, PiggyBank } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { getMonthSummary, getCategoryTotals, getTransactions } from '@/lib/actions/transactions'
import { getPlannedAmounts } from '@/lib/actions/budgets'
import { getCategories } from '@/lib/actions/categories'
import { getSettings } from '@/lib/actions/settings'
import type { CategoryWithChildren, Transaction } from '@/types/budget'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, total_savings: 0, remaining: 0 })
  const [categoryProgress, setCategoryProgress] = useState<{ name: string; planned: number; actual: number; percentage: number }[]>([])
  const [dailyTrend, setDailyTrend] = useState<{ day: string; amount: number }[]>([])

  useEffect(() => {
    async function load() {
      try {
        const settings = await getSettings()
        const now = new Date()
        const year = settings?.current_year || now.getFullYear()
        const month = now.getMonth() + 1

        const budget = await getOrCreateBudget(year, month)
        const [summaryData, catTotals, planned, categories, transactions] = await Promise.all([
          getMonthSummary(budget.id),
          getCategoryTotals(budget.id),
          getPlannedAmounts(budget.id),
          getCategories(),
          getTransactions(budget.id),
        ])

        setSummary(summaryData)

        // Build category progress (expense parents only)
        const expenseParents = categories.filter(c => c.type === 'expense')
        const plannedMap: Record<string, number> = {}
        for (const p of planned) {
          plannedMap[p.category_id] = Number(p.amount)
        }

        const progress = expenseParents.map(parent => {
          const childIds = parent.children.map(c => c.id)
          const actualTotal = childIds.reduce((sum, id) => sum + (catTotals[id] || 0), 0) + (catTotals[parent.id] || 0)
          const plannedTotal = childIds.reduce((sum, id) => sum + (plannedMap[id] || 0), 0) + (plannedMap[parent.id] || 0)
          const percentage = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0

          return {
            name: parent.name,
            planned: plannedTotal,
            actual: actualTotal,
            percentage,
          }
        }).filter(p => p.planned > 0 || p.actual > 0)

        setCategoryProgress(progress)

        // Build daily cumulative trend (expenses)
        const expenseTransactions = transactions.filter(
          t => t.category && (t.category as unknown as { type: string }).type === 'expense'
        )
        const dailyMap: Record<number, number> = {}
        for (const t of expenseTransactions) {
          const day = new Date(t.date).getDate()
          dailyMap[day] = (dailyMap[day] || 0) + Number(t.amount)
        }

        const daysInMonth = new Date(year, month, 0).getDate()
        const today = now.getDate()
        const trend: { day: string; amount: number }[] = []
        let cumulative = 0
        for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
          cumulative += dailyMap[d] || 0
          trend.push({ day: String(d), amount: Math.round(cumulative * 100) / 100 })
        }
        setDailyTrend(trend)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd ładowania danych')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6c5ce7] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675]">
        {error}
      </div>
    )
  }

  const hasData = summary.total_income > 0 || summary.total_expenses > 0

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Przychody" amount={summary.total_income} icon={TrendingUp} color="text-[#00b894]" />
        <StatCard title="Wydatki" amount={summary.total_expenses} icon={TrendingDown} color="text-[#e17055]" />
        <StatCard title="Oszczędności" amount={summary.total_savings} icon={PiggyBank} color="text-[#74b9ff]" />
        <StatCard
          title="Zostaje"
          amount={summary.remaining}
          icon={DollarSign}
          color={summary.remaining >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {!hasData && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-8 text-center">
          <p className="text-[#999] mb-2">Brak transakcji w tym miesiącu.</p>
          <p className="text-[#666] text-sm">
            Dodaj pierwszą transakcję w widoku miesięcznym lub zeskanuj paragon.
          </p>
        </div>
      )}

      {/* Categories Progress */}
      {categoryProgress.length > 0 && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Plan vs Realizacja</h2>
          <div className="space-y-4">
            {categoryProgress.map((category) => (
              <CategoryProgressBar key={category.name} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* Daily Spending Trend */}
      {dailyTrend.length > 0 && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">Skumulowane wydatki</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                <XAxis dataKey="day" stroke="#666" style={{ fontSize: '12px' }} />
                <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e24',
                    border: '1px solid #2a2a35',
                    borderRadius: '8px',
                    color: '#ededed',
                  }}
                  formatter={(value) => [`${value} zł`, 'Wydatki']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6c5ce7" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  title,
  amount,
  icon: Icon,
  color,
}: {
  title: string
  amount: number
  icon: React.ComponentType<{ className: string }>
  color: string
}) {
  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 hover:border-[#6c5ce7] transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#999]">{title}</h3>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-[#ededed]">
        {amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
      </p>
    </div>
  )
}

function CategoryProgressBar({
  category,
}: {
  category: { name: string; planned: number; actual: number; percentage: number }
}) {
  const isOverBudget = category.percentage > 100
  const barColor = isOverBudget ? 'bg-[#e17055]' : 'bg-[#00b894]'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#ededed]">{category.name}</span>
        <span className={`text-xs font-semibold ${isOverBudget ? 'text-[#e17055]' : 'text-[#00b894]'}`}>
          {category.percentage}%
        </span>
      </div>
      <div className="w-full bg-[#1e1e24] rounded-full h-2 overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(category.percentage, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-[#666]">
          {category.actual.toLocaleString('pl-PL')} / {category.planned.toLocaleString('pl-PL')} zł
        </span>
      </div>
    </div>
  )
}
