'use client'

import { useState } from 'react'
import {
  Wallet,
  TrendingUp,
  Plus,
  MoreVertical,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const mockAccounts = [
  {
    id: '1',
    name: 'Moje konto główne',
    type: 'checking',
    balance: 4250.75,
    currency: 'PLN',
  },
  {
    id: '2',
    name: 'Oszczędności',
    type: 'savings',
    balance: 12500.00,
    currency: 'PLN',
  },
  {
    id: '3',
    name: 'Karta kredytowa',
    type: 'credit_card',
    balance: -850.50,
    currency: 'PLN',
  },
  {
    id: '4',
    name: 'Gotówka',
    type: 'cash',
    balance: 450.00,
    currency: 'PLN',
  },
]

const monthlyWealthData = [
  { month: 'Styczeń', total: 14500 },
  { month: 'Luty', total: 15200 },
  { month: 'Marzec', total: 15800 },
  { month: 'Kwieczeń', total: 16500 },
  { month: 'Maj', total: 17200 },
  { month: 'Czerwiec', total: 17350.25 },
]

export default function AccountsPage() {
  const totalWealth = mockAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const previousMonth = 15350.25
  const change = totalWealth - previousMonth
  const changePercent = ((change / previousMonth) * 100).toFixed(2)

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Konta</h1>
          <p className="text-[#999] mt-1">Zarządzaj swoimi kontami i portfelem</p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-5 h-5" />
          <span>Dodaj konto</span>
        </button>
      </div>

      {/* Total Wealth Card */}
      <div className="bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] rounded-lg p-8 text-white">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm opacity-90 mb-1">Całkowity majątek</p>
            <h2 className="text-4xl font-bold">
              {totalWealth.toLocaleString('pl-PL', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              zł
            </h2>
          </div>
          <Wallet className="w-12 h-12 opacity-50" />
        </div>
        <div className="flex items-center space-x-2">
          {change >= 0 ? (
            <>
              <ArrowUpRight className="w-5 h-5 text-green-400" />
              <span>+{change.toFixed(2)} zł ({changePercent}%) od marzca</span>
            </>
          ) : (
            <>
              <ArrowDownLeft className="w-5 h-5 text-red-400" />
              <span>{change.toFixed(2)} zł ({changePercent}%) od marzca</span>
            </>
          )}
        </div>
      </div>

      {/* Wealth Growth Chart */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
        <h3 className="text-lg font-semibold text-[#ededed] mb-6">
          Wzrost majątku
        </h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyWealthData}>
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
              <Bar dataKey="total" fill="#6c5ce7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockAccounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}

function AccountCard({
  account,
}: {
  account: {
    id: string
    name: string
    type: string
    balance: number
    currency: string
  }
}) {
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return '🏖'
      case 'savings':
        return '🏪'
      case 'credit_card':
        return '💳'
      case 'cash':
        return '💵'
      default:
        return '💰'
    }
  }

  const isNegative = account.balance < 0
  const balanceColor = isNegative ? 'text-[#e17055]' : 'text-[#00b894]'

  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6 hover:border-[#6c5ce7] transition">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{getAccountIcon(account.type)}</div>
          <div>
            <h3 className="font-semibold text-[#ededed]">{account.name}</h3>
            <p className="text-xs text-[#666] capitalize">{account.type}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-[#1e1e24] rounded-lg transition">
          <MoreVertical className="w-5 h-5 text-[#666]" />
        </button>
      </div>

      <div className="pt-4 border-t border-[#2a2a35]">
        <p className="text-xs text-[#666] mb-1">Saldo</p>
        <p className={`text-2xl font-bold ${balanceColor}`}>
          {account.balance.toLocaleString('pl-PL', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {account.currency}
        </p>
      </div>
    </div>
  )
}
