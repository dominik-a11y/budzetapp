'use server'

import { createClient } from '@/lib/supabase/server'
import type { BudgetType } from '@/types/budget'

export interface MonthData {
  month: number
  monthName: string
  planned: number
  actual: number
  income: number
  expenses: number
  savings: number
}

export interface CategoryYearlyData {
  category_id: string
  category_name: string
  amount: number
}

const MONTH_NAMES = [
  'Stycze\u0144', 'Luty', 'Marzec', 'Kwiecie\u0144', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpie\u0144', 'Wrzesie\u0144', 'Pa\u017adziernik', 'Listopad', 'Grudzie\u0144',
]

export async function getYearSummary(
  year: number,
  budgetType: BudgetType = 'home'
): Promise<{ months: MonthData[]; categoryBreakdown: CategoryYearlyData[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  // Get all budgets for this year
  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('id, month')
    .eq('year', year)
    .eq('budget_type', budgetType)
    .order('month')

  if (budgetError) throw new Error(budgetError.message)

  const budgetIds = (budgets || []).map(b => b.id)
  const budgetMonthMap = new Map((budgets || []).map(b => [b.id, b.month]))

  // If no budgets, return empty data
  if (budgetIds.length === 0) {
    return {
      months: MONTH_NAMES.map((name, i) => ({
        month: i + 1,
        monthName: name,
        planned: 0,
        actual: 0,
        income: 0,
        expenses: 0,
        savings: 0,
      })),
      categoryBreakdown: [],
    }
  }

  // Get all transactions for these budgets (with category type)
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('budget_id, category_id, amount, category:categories(name, type, parent_id)')
    .in('budget_id', budgetIds)

  if (txError) throw new Error(txError.message)

  // Get all planned amounts for these budgets
  const { data: planned, error: plannedError } = await supabase
    .from('planned_amounts')
    .select('budget_id, amount')
    .in('budget_id', budgetIds)

  if (plannedError) throw new Error(plannedError.message)

  // Aggregate by month
  const monthlyMap: Record<number, { planned: number; income: number; expenses: number; savings: number }> = {}
  for (let m = 1; m <= 12; m++) {
    monthlyMap[m] = { planned: 0, income: 0, expenses: 0, savings: 0 }
  }

  // Sum planned amounts per month
  for (const p of planned || []) {
    const month = budgetMonthMap.get(p.budget_id)
    if (month) {
      monthlyMap[month].planned += Number(p.amount)
    }
  }

  // Sum transactions per month and per category
  const categoryTotals: Record<string, { name: string; amount: number }> = {}

  for (const tx of transactions || []) {
    const month = budgetMonthMap.get(tx.budget_id)
    const cat = tx.category as unknown as { name: string; type: string; parent_id: string | null } | null
    const amount = Number(tx.amount)

    if (month && cat) {
      if (cat.type === 'income') monthlyMap[month].income += amount
      else if (cat.type === 'expense') monthlyMap[month].expenses += amount
      else if (cat.type === 'savings') monthlyMap[month].savings += amount
    }

    // Category breakdown (only expenses, group by parent if exists)
    if (cat && cat.type === 'expense') {
      // Use parent category name if this is a child
      const catId = cat.parent_id || tx.category_id
      if (!categoryTotals[catId]) {
        // We'll need parent name — for now use what we have
        categoryTotals[catId] = { name: cat.parent_id ? '' : cat.name, amount: 0 }
      }
      categoryTotals[catId].amount += amount
    }
  }

  // If parent names are missing, fetch them
  const missingIds = Object.keys(categoryTotals).filter(id => !categoryTotals[id].name)
  if (missingIds.length > 0) {
    const { data: parents } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', missingIds)

    for (const p of parents || []) {
      if (categoryTotals[p.id]) {
        categoryTotals[p.id].name = p.name
      }
    }
  }

  const months: MonthData[] = MONTH_NAMES.map((name, i) => {
    const m = i + 1
    const data = monthlyMap[m]
    return {
      month: m,
      monthName: name,
      planned: data.planned,
      actual: data.expenses,
      income: data.income,
      expenses: data.expenses,
      savings: data.savings,
    }
  })

  const categoryBreakdown: CategoryYearlyData[] = Object.entries(categoryTotals)
    .map(([id, val]) => ({
      category_id: id,
      category_name: val.name || 'Nieznana',
      amount: val.amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { months, categoryBreakdown }
}
