'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getYearSummary } from '@/lib/actions/year-summary'
import type { MonthData, CategoryYearlyData } from '@/lib/actions/year-summary'

export default function YearPage() {
  const params = useParams()
  const router = useRouter()
  const year = parseInt(params.year as string)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<MonthData[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryYearlyData[]>([])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getYearSummary(year)
        setMonths(data.months)
        setCategoryBreakdown(data.categoryBreakdown)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'B\u0142\u0105d \u0142adowania danych')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year])

  const totalPlanned = months.reduce((s, m) => s + m.planned, 0)
  const totalActual = months.reduce((s, m) => s + m.actual, 0)
  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const difference = totalPlanned - totalActual
  const totalByCategory = categoryBreakdown.reduce((s, c) => s + c.amount, 0)

  // Chart data — only months with data or all 12
  const chartData = months.map(m => ({
    month: m.monthName.substring(0, 3),
    plan: m.planned,
    actual: m.actual,
  }))

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
          <h1 className="text-3xl font-bold text-[#ededed] mb-2">Rok {year}</h1>
          <p className="text-[#999]">Przegl\u0105d bud\u017cetu za ca\u0142y rok</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push(`/dashboard/year/${year - 1}`)}
            className="p-2 hover:bg-[#1e1e24] rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-[#ededed]" />
          </button>
          <button
            onClick={() => router.push(`/dashboard/year/${year + 1}`)}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Przychody" amount={totalIncome} color="text-[#00b894]" />
        <SummaryCard title="Plan wydatk\u00f3w" amount={totalPlanned} color="text-[#74b9ff]" />
        <SummaryCard title="Wydatki" amount={totalActual} color="text-[#a29bfe]" />
        <SummaryCard
          title="R\u00f3\u017cnica"
          amount={difference}
          color={difference >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {/* Monthly Chart */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h2 className="text-lg font-semibold text-[#ededed] mb-6">
          Plan vs Realizacja (miesi\u0119czny podzia\u0142)
        </h2>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
              <XAxis dataKey="month" stroke="#666" style={{ fontSize: '12px' }} />
              <YAxis stroke="#666" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e24',
                  border: '1px solid #2a2a35',
                  borderRadius: '8px',
                  color: '#ededed',
                }}
                formatter={(value: number) => `${value.toLocaleString('pl-PL')} z\u0142`}
              />
              <Legend />
              <Bar dataKey="plan" name="Plan" fill="#74b9ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" name="Realizacja" fill="#6c5ce7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
          <h2 className="text-lg font-semibold text-[#ededed] mb-6">
            Wydatki rocznie po kategoriach
          </h2>
          <div className="space-y-4">
            {categoryBreakdown.map((cat) => {
              const percentage = totalByCategory > 0 ? (cat.amount / totalByCategory) * 100 : 0

              return (
                <div key={cat.category_id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#ededed]">
                      {cat.category_name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-[#a29bfe]">
                        {cat.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} z\u0142
                      </span>
                      <span className="text-xs text-[#666]">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#1e1e24] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 pt-6 border-t border-[#2a2a35]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#ededed]">Razem</span>
              <span className="text-lg font-bold text-[#a29bfe]">
                {totalByCategory.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} z\u0142
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Months Table */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a35] bg-[#1e1e24]">
                <th className="px-6 py-3 text-left font-semibold text-[#ededed]">Miesi\u0105c</th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">Przychody</th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">Plan</th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">Wydatki</th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">R\u00f3\u017cnica</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const diff = m.planned - m.actual
                const hasData = m.planned > 0 || m.actual > 0 || m.income > 0

                return (
                  <tr
                    key={m.month}
                    onClick={() => router.push(`/dashboard/month/${year}/${m.month}`)}
                    className={`border-b border-[#2a2a35] transition cursor-pointer ${
                      hasData ? 'hover:bg-[#1e1e24]' : 'opacity-50 hover:bg-[#1e1e24]'
                    }`}
                  >
                    <td className="px-6 py-3 text-[#ededed] font-medium">{m.monthName}</td>
                    <td className="px-6 py-3 text-right text-[#00b894]">
                      {m.income > 0 ? `${m.income.toLocaleString('pl-PL')} z\u0142` : '\u2014'}
                    </td>
                    <td className="px-6 py-3 text-right text-[#74b9ff]">
                      {m.planned > 0 ? `${m.planned.toLocaleString('pl-PL')} z\u0142` : '\u2014'}
                    </td>
                    <td className="px-6 py-3 text-right text-[#a29bfe]">
                      {m.actual > 0 ? `${m.actual.toLocaleString('pl-PL')} z\u0142` : '\u2014'}
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${
                      m.planned === 0 && m.actual === 0
                        ? 'text-[#666]'
                        : diff >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'
                    }`}>
                      {m.planned === 0 && m.actual === 0
                        ? '\u2014'
                        : `${diff.toLocaleString('pl-PL')} z\u0142`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#1e1e24]">
                <td className="px-6 py-3 font-bold text-[#ededed]">Razem</td>
                <td className="px-6 py-3 text-right font-bold text-[#00b894]">
                  {totalIncome.toLocaleString('pl-PL')} z\u0142
                </td>
                <td className="px-6 py-3 text-right font-bold text-[#74b9ff]">
                  {totalPlanned.toLocaleString('pl-PL')} z\u0142
                </td>
                <td className="px-6 py-3 text-right font-bold text-[#a29bfe]">
                  {totalActual.toLocaleString('pl-PL')} z\u0142
                </td>
                <td className={`px-6 py-3 text-right font-bold ${
                  difference >= 0 ? 'text-[#00b894]' : 'text-[#e17055]'
                }`}>
                  {difference.toLocaleString('pl-PL')} z\u0142
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
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
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
      <p className="text-sm font-medium text-[#999] mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} z\u0142
      </p>
    </div>
  )
}
