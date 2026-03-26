'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, DollarSign, Loader2, PiggyBank, Plus, Camera, Calendar, ArrowRight, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { getMonthSummary, getCategoryTotals, getTransactions } from '@/lib/actions/transactions'
import { getPlannedAmounts } from '@/lib/actions/budgets'
import { getCategories } from '@/lib/actions/categories'
import { getSettings } from '@/lib/actions/settings'
import type { Transaction } from '@/types/budget'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0, total_savings: 0, remaining: 0 })
  const [categoryProgress, setCategoryProgress] = useState<{ name: string; planned: number; actual: number; percentage: number }[]>([])
  const [dailyTrend, setDailyTrend] = useState<{ day: string; amount: number }[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    async function load() {
      try {
        const settings = await getSettings()
        const now = new Date()
        const year = settings?.current_year || now.getFullYear()
        const month = now.getMonth() + 1
        setCurrentYear(year)
        setCurrentMonth(month)

        const budget = await getOrCreateBudget(year, month)
        const [summaryData, catTotals, planned, categories, transactions] = await Promise.all([
          getMonthSummary(budget.id),
          getCategoryTotals(budget.id),
          getPlannedAmounts(budget.id),
          getCategories(),
          getTransactions(budget.id),
        ])

        setSummary(summaryData)
        setRecentTransactions(transactions.slice(0, 5))

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

          return { name: parent.name, planned: plannedTotal, actual: actualTotal, percentage }
        }).filter(p => p.planned > 0 || p.actual > 0)

        setCategoryProgress(progress)

        // Build daily cumulative trend
        const expenseTx = transactions.filter(
          t => t.category && (t.category as unknown as { type: string }).type === 'expense'
        )
        const dailyMap: Record<number, number> = {}
        for (const t of expenseTx) {
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
        setError(err instanceof Error ? err.message : 'B\u0142\u0105d \u0142adowania danych')
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

  const MONTH_NAMES = [
    'Stycze\u0144', 'Luty', 'Marzec', 'Kwiecie\u0144', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpie\u0144', 'Wrzesie\u0144', 'Pa\u017adziernik', 'Listopad', 'Grudzie\u0144',
  ]
  const monthName = MONTH_NAMES[currentMonth - 1]
  const hasData = summary.total_income > 0 || summary.total_expenses > 0

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome + Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#ededed]">{monthName} {currentYear}</h1>
          <p className="text-[#999] text-sm">Przegl\u0105d bie\u017c\u0105cego miesi\u0105ca</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/month/${currentYear}/${currentMonth}`}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-4 py-2.5 rounded-lg transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj transakcj\u0119</span>
          </Link>
          <Link
            href="/dashboard/scan"
            className="flex items-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold px-4 py-2.5 rounded-lg border border-[#2a2a35] transition text-sm"
          >
            <Camera className="w-4 h-4" />
            <span>Skanuj</span>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Przychody" amount={summary.total_income} icon={TrendingUp} color="text-[#00b894]" />
        <StatCard title="Wydatki" amount={summary.total_expenses} icon={TrendingDown} color="text-[#e17055]" />
        <StatCard title="Oszcz\u0119dno\u015bci" amount={summary.total_savings} icon={PiggyBank} color="text-[#74b9ff]" />
        <StatCard
          title="Zostaje"
          amount={summary.remaining}
          icon={DollarSign}
          color={summary.remaining >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {!hasData && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#6c5ce7]/10 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-[#6c5ce7]" />
          </div>
          <div>
            <p className="text-[#ededed] font-semibold mb-1">Brak transakcji w tym miesi\u0105cu</p>
            <p className="text-[#666] text-sm mb-4">
              Zacznij od dodania transakcji lub zeskanowania paragonu.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/dashboard/month/${currentYear}/${currentMonth}`}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj transakcj\u0119</span>
            </Link>
            <Link
              href="/dashboard/scan"
              className="flex items-center space-x-2 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold px-6 py-3 rounded-lg border border-[#2a2a35] transition text-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Skanuj paragon</span>
            </Link>
            <Link
              href="/dashboard/categories"
              className="flex items-center space-x-2 text-[#6c5ce7] hover:text-[#a29bfe] font-medium px-4 py-3 transition text-sm"
            >
              <span>Edytuj kategorie</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Categories Progress */}
      {categoryProgress.length > 0 && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#ededed]">Plan vs Realizacja</h2>
            <Link
              href={`/dashboard/month/${currentYear}/${currentMonth}`}
              className="text-xs text-[#6c5ce7] hover:text-[#a29bfe] transition"
            >
              Szczeg\u00f3\u0142y &rarr;
            </Link>
          </div>
          <div className="space-y-4">
            {categoryProgress.map((category) => (
              <CategoryProgressBar key={category.name} category={category} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
            <h2 className="text-lg font-semibold text-[#ededed]">Ostatnie transakcje</h2>
            <Link
              href={`/dashboard/month/${currentYear}/${currentMonth}`}
              className="text-xs text-[#6c5ce7] hover:text-[#a29bfe] transition"
            >
              Wszystkie &rarr;
            </Link>
          </div>
          <div className="divide-y divide-[#2a2a35]">
            {recentTransactions.map(tx => {
              const cat = tx.category as unknown as { name: string; type: string } | undefined
              return (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#ededed]">{cat?.name || 'Brak kategorii'}</p>
                    {tx.description && <p className="text-xs text-[#666]">{tx.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#ededed]">
                      {Number(tx.amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} z\u0142
                    </p>
                    <p className="text-xs text-[#666]">
                      {new Date(tx.date).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                </div>
              )
            })}
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
                  formatter={(value: number) => [`${value} z\u0142`, 'Wydatki']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6c5ce7" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickLink href={`/dashboard/year/${currentYear}`} label="Widok roczny" icon={BarChart3} />
        <QuickLink href="/dashboard/accounts" label="Konta" icon={DollarSign} />
        <QuickLink href="/dashboard/categories" label="Kategorie" icon={Calendar} />
        <QuickLink href="/dashboard/documents" label="Dokumenty" icon={Camera} />
      </div>
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
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4 md:p-6 hover:border-[#6c5ce7] transition">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs md:text-sm font-medium text-[#999]">{title}</h3>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} />
      </div>
      <p className="text-lg md:text-2xl font-bold text-[#ededed]">
        {amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} z\u0142
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
          {category.actual.toLocaleString('pl-PL')} / {category.planned.toLocaleString('pl-PL')} z\u0142
        </span>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className: string }>
}) {
  return (
    <Link
      href={href}
      className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4 flex flex-col items-center justify-center space-y-2 hover:border-[#6c5ce7] hover:bg-[#1e1e24] transition group"
    >
      <Icon className="w-6 h-6 text-[#666] group-hover:text-[#6c5ce7] transition" />
      <span className="text-xs font-medium text-[#999] group-hover:text-[#ededed] transition">{label}</span>
    </Link>
  )
}
