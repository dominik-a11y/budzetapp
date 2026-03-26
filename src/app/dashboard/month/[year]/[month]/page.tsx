'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams } from 'next/navigation'

const monthNames = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

const mockTransactions = [
  { day: 1, category: 'Jedzenie', subcategory: 'Jedzenie dom', planned: 20, actual: 45 },
  { day: 2, category: 'Transport', subcategory: 'Paliwo do auta', planned: 20, actual: 0 },
  { day: 3, category: 'Jedzenie', subcategory: 'Jedzenie miasto', planned: 30, actual: 60 },
  { day: 5, category: 'Transport', subcategory: 'Paliwo do auta', planned: 20, actual: 60 },
  { day: 8, category: 'Mieszkanie', subcategory: 'Czynsz', planned: 500, actual: 500 },
  { day: 10, category: 'Higiena', subcategory: 'Kosmetyki', planned: 20, actual: 35 },
  { day: 12, category: 'Rozrywka', subcategory: 'Kino / Teatr', planned: 50, actual: 50 },
  { day: 15, category: 'Jedzenie', subcategory: 'Jedzenie dom', planned: 20, actual: 55 },
]

const categoryGroups = [
  {
    name: 'Jedzenie',
    planned: 600,
    actual: 650,
    subcategories: [
      { name: 'Jedzenie dom', planned: 400, actual: 430 },
      { name: 'Jedzenie miasto', planned: 150, actual: 180 },
      { name: 'Alkohol', planned: 50, actual: 40 },
    ],
  },
  {
    name: 'Transport',
    planned: 400,
    actual: 380,
    subcategories: [
      { name: 'Paliwo do auta', planned: 300, actual: 280 },
      { name: 'Bilet komunikacji', planned: 100, actual: 100 },
    ],
  },
  {
    name: 'Mieszkanie',
    planned: 1500,
    actual: 1500,
    subcategories: [
      { name: 'Czynsz', planned: 1000, actual: 1000 },
      { name: 'Prąd', planned: 250, actual: 250 },
      { name: 'Woda', planned: 150, actual: 150 },
      { name: 'Gaz', planned: 100, actual: 100 },
    ],
  },
  {
    name: 'Higiena',
    planned: 150,
    actual: 120,
    subcategories: [
      { name: 'Kosmetyki', planned: 80, actual: 65 },
      { name: 'Fryzjer', planned: 70, actual: 55 },
    ],
  },
  {
    name: 'Rozrywka',
    planned: 300,
    actual: 320,
    subcategories: [
      { name: 'Kino / Teatr', planned: 150, actual: 150 },
      { name: 'Hobby', planned: 100, actual: 120 },
      { name: 'Książki', planned: 50, actual: 50 },
    ],
  },
]

export default function MonthPage() {
  const params = useParams()
  const monthNum = parseInt(params.month as string) - 1
  const year = params.year as string
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const monthName = monthNames[monthNum]
  const totalPlanned = categoryGroups.reduce((sum, g) => sum + g.planned, 0)
  const totalActual = categoryGroups.reduce((sum, g) => sum + g.actual, 0)
  const remaining = totalPlanned - totalActual

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">
            {monthName} {year}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-[#1e1e24] rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-[#ededed]" />
          </button>
          <button className="p-2 hover:bg-[#1e1e24] rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-[#ededed]" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Plan"
          amount={totalPlanned}
          color="text-[#74b9ff]"
        />
        <SummaryCard
          title="Realizacja"
          amount={totalActual}
          color="text-[#a29bfe]"
        />
        <SummaryCard
          title="Pozostało"
          amount={remaining}
          color={remaining > 0 ? 'text-[#00b894]' : 'text-[#e17055]'}
        />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categoryGroups.map((group) => {
          const isOver = group.actual > group.planned
          const isExpanded = expanded === group.name

          return (
            <div
              key={group.name}
              className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() =>
                  setExpanded(isExpanded ? null : group.name)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-[#1e1e24] transition"
              >
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-[#ededed]">
                    {group.name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="text-[#666]">Plan: {group.planned} zł</span>
                    <span className="text-[#666]">
                      Realizacja: {group.actual} zł
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver ? 'text-[#e17055]' : 'text-[#00b894]'
                      }`}
                    >
                      {((group.actual / group.planned) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#1e1e24] rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        isOver ? 'bg-[#e17055]' : 'bg-[#00b894]'
                      }`}
                      style={{
                        width: `${Math.min((group.actual / group.planned) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Subcategories */}
              {isExpanded && (
                <div className="border-t border-[#2a2a35] bg-[#1e1e24] p-4 space-y-3">
                  {group.subcategories.map((sub) => (
                    <div key={sub.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#999]">
                          {sub.name}
                        </span>
                        <span className="text-xs text-[#666]">
                          {sub.actual} / {sub.planned} zł
                        </span>
                      </div>
                      <div className="w-full bg-[#141418] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            sub.actual > sub.planned
                              ? 'bg-[#e17055]'
                              : 'bg-[#00b894]'
                          }`}
                          style={{
                            width: `${Math.min((sub.actual / sub.planned) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
