import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/budget'

export async function getTransactions(budgetId: string): Promise<Transaction[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('budget_id', budgetId)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Transaction[]
}

export async function getTransactionsForMonth(
  year: number,
  month: number
): Promise<Transaction[]> {
  const supabase = createClient()

  // Find the budget for this month
  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .eq('budget_type', 'home')
    .maybeSingle()

  if (!budget) return []

  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('budget_id', budget.id)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Transaction[]
}

export async function createTransaction(input: {
  budget_id: string
  category_id: string
  amount: number
  date: string
  description?: string
  document_id?: string
}): Promise<Transaction> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      budget_id: input.budget_id,
      category_id: input.category_id,
      amount: input.amount,
      date: input.date,
      description: input.description || null,
      document_id: input.document_id || null,
    })
    .select('*, category:categories(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as Transaction
}

export async function updateTransaction(
  id: string,
  input: {
    category_id?: string
    amount?: number
    date?: string
    description?: string
    document_id?: string | null
  }
): Promise<Transaction> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()

  if (error) throw new Error(error.message)
  return data as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ===== AGGREGATIONS =====

export async function getMonthSummary(budgetId: string) {
  const supabase = createClient()

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category:categories(type)')
    .eq('budget_id', budgetId)

  if (error) throw new Error(error.message)

  let total_income = 0
  let total_expenses = 0
  let total_savings = 0

  for (const t of transactions || []) {
    const cat = t.category as unknown as { type: string } | null
    const amount = Number(t.amount)
    if (cat?.type === 'income') total_income += amount
    else if (cat?.type === 'expense') total_expenses += amount
    else if (cat?.type === 'savings') total_savings += amount
  }

  return {
    total_income,
    total_expenses,
    total_savings,
    remaining: total_income - total_expenses - total_savings,
  }
}

export async function getCategoryTotals(budgetId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('budget_id', budgetId)

  if (error) throw new Error(error.message)

  const totals: Record<string, number> = {}
  for (const t of data || []) {
    const catId = t.category_id
    totals[catId] = (totals[catId] || 0) + Number(t.amount)
  }
  return totals
}
