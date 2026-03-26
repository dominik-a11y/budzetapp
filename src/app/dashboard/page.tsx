'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockMonthData = {
  income: 5000,
  expenses: 3200,
  savings: 800,
}

const mockCategoryData = [
  { name: 'Jedzenie', planned: 600, actual: 650, percentage: 108 },
  { name: 'Transport', planned: 400, actual: 380, percentage: 95 },
  { name: 'Mieszkanie', planned: 1500, actual: 1500, percentage: 100 },
  { name: 'Higiena', planned: 150, actual: 120, percentage: 80 },
  { name: 'Rozrywka', planned: 300, actual: 320, percentage: 107 },
  { name: 'Inne wydatki', planned: 250, actual: 230, percentage: 92 },
]

const dailyTrendData = [
  { day: '1', amount: 120 },
  { day: '2', amount: 200 },
  { day: '3', amount: 180 },
  { day: '4', amount: 350 },
  { day: '5', amount: 280 },
  { day: '6', amount: 420 },
  { day: '7', amount: 390 },
  { day: '8', amount: 510 },
  { day: '9', amount: 480 },
  { day: '10', amount: 620 },
  { day: '11', amount: 550 },
  { day: '12', amount: 680 },
  { day: '13', amount: 720 },
  { day: '14', amount: 650 },
  { day: '15', amount: 780 },
]

export default function DashboardPage() {
  const remaining = mockMonthData.income - mockMonthData.expenses - mockMonthData.savings

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Przychody"
          amount={mockMonthData.income}
          icon={TrendingUp}
          trend="up"
          color="text-[#00b894]"
        />
        <StatCard
          title="Wydatki"
          amount={mockMonthData.expenses}
          icon={TrendingDown}
          trend="down"
          color="text-[#e17055]"
        />
        <StatCard
          title="Zostaje"
          amount={remaining}
          icon={DollarSign}
          trend={remaining > 0 ? 'up' : 'down'}
          color={remaining > 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {/* Categories Progress */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h2 className="text-lg font-semibold text-[#ededed] mb-6">
          Plan vs Realizacja
        </h2>
        <div className="space-y-4">
          {mockCategoryData.map((category) => (
            <CategoryProgressBar key={category.name} category={category} />
          ))}
        </div>
      </div>

      {/* Daily Spending Trend */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h2 className="text-lg font-semibold text-[#ededed] mb-6">
          Trend wydatków dziennych
        </h2>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
              <XAxis
                dataKey="day"
                stroke="#666"
                style={{ fontSize: '12px' }}
              />
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
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#6c5ce7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  amount,
  icon: Icon,
  trend,
  color,
}: {
  title: string
  amount: number
  icon: React.ComponentType<{ className: string }>
  trend: 'up' | 'down'
  color: string
}) {
  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 hover:border-[#6c5ce7] transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#999]">{title}</h3>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-[#ededed]">
            {amount.toLocaleString('pl-PL')} zł
          </p>
        </div>
      </div>
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
        <span className="text-sm font-medium text-[#ededed]">
          {category.name}
        </span>
        <span className={`text-xs font-semibold ${isOverBudget ? 'text-[#e17055]' : 'text-[#00b894]'}`}>
          {category.percentage}%
        </span>
      </div>
      <div className="w-full bg-[#1e1e24] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.min(category.percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-[#666]">
          {category.actual} / {category.planned} zł
        </span>
      </div>
    </div>
  )
}
