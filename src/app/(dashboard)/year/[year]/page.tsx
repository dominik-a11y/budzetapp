'use client'

import { useParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const monthlyData = [
  { month: 'Styczeń', plan: 5000, actual: 4850 },
  { month: 'Luty', plan: 5000, actual: 5120 },
  { month: 'Marzec', plan: 5000, actual: 4980 },
  { month: 'Kwieczeń', plan: 5000, actual: 5300 },
  { month: 'Maj', plan: 5000, actual: 5100 },
  { month: 'Czerwiec', plan: 5000, actual: 5050 },
]

const categoryYearlyData = [
  { category: 'Jedzenie', amount: 7200 },
  { category: 'Transport', amount: 4800 },
  { category: 'Mieszkanie', amount: 18000 },
  { category: 'Higiena', amount: 1800 },
  { category: 'Rozrywka', amount: 3600 },
  { category: 'Inne', amount: 2400 },
]

export default function YearPage() {
  const params = useParams()
  const year = params.year as string

  const totalPlanned = monthlyData.reduce((sum, d) => sum + d.plan, 0)
  const totalActual = monthlyData.reduce((sum, d) => sum + d.actual, 0)
  const totalByCategory = categoryYearlyData.reduce((sum, d) => sum + d.amount, 0)
  const difference = totalPlanned - totalActual

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Rok {year}</h1>
        <p className="text-[#999]">Przegląd wydatków za cały rok</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Plan roczny"
          amount={totalPlanned}
          color="text-[#74b9ff]"
        />
        <SummaryCard
          title="Realizacja"
          amount={totalActual}
          color="text-[#a29bfe]"
        />
        <SummaryCard
          title="Różnica"
          amount={difference}
          color={difference > 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {/* Monthly Chart */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h2 className="text-lg font-semibold text-[#ededed] mb-6">
          Plan vs Realizacja (miesięczny podział)
        </h2>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
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
              />
              <Legend />
              <Bar dataKey="plan" fill="#74b9ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#6c5ce7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h2 className="text-lg font-semibold text-[#ededed] mb-6">
          Wydatki rocznie po kategoriach
        </h2>
        <div className="space-y-4">
          {categoryYearlyData.map((cat) => {
            const percentage = (cat.amount / totalByCategory) * 100

            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#ededed]">
                    {cat.category}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-[#a29bfe]">
                      {cat.amount.toLocaleString('pl-PL')} zł
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
            <span className="font-semibold text-[#ededed]">
              Razem
            </span>
            <span className="text-lg font-bold text-[#a29bfe]">
              {totalByCategory.toLocaleString('pl-PL')} zł
            </span>
          </div>
        </div>
      </div>

      {/* Months Table */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a35] bg-[#1e1e24]">
                <th className="px-6 py-3 text-left font-semibold text-[#ededed]">
                  Miesiąc
                </th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">
                  Plan
                </th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">
                  Realizacja
                </th>
                <th className="px-6 py-3 text-right font-semibold text-[#ededed]">
                  Różnica
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((month, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[#2a2a35] hover:bg-[#1e1e24] transition"
                >
                  <td className="px-6 py-3 text-[#ededed]">{month.month}</td>
                  <td className="px-6 py-3 text-right text-[#74b9ff]">
                    {month.plan.toLocaleString('pl-PL')} zł
                  </td>
                  <td className="px-6 py-3 text-right text-[#a29bfe]">
                    {month.actual.toLocaleString('pl-PL')} zł
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-semibold ${
                      month.plan - month.actual > 0
                        ? 'text-[#00b894]'
                        : 'text-[#e17055]'
                    }`}
                  >
                    {(month.plan - month.actual).toLocaleString('pl-PL')} zł
                  </td>
                </tr>
              ))}
            </tbody>
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
        {amount.toLocaleString('pl-PL')} zł
      </p>
    </div>
  )
}
