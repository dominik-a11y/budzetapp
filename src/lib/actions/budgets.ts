import { createClient } from '@/lib/supabase/client'
import type { Budget, PlannedAmount, BudgetType } from '@/types/budget'

export async function getOrCreateBudget(
  year: number,
  month: number,
  budgetType: BudgetType = 'home'
): Promise<Budget> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  // Try to find existing budget
  const { data: existing } = await supabase
    .from('budgets')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .eq('budget_type', budgetType)
    .maybeSingle()

  if (existing) return existing as Budget

  // Create new budget
  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: user.id,
      year,
      month,
      budget_type: budgetType,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Budget
}

export async function getBudgetsForYear(
  year: number,
  budgetType: BudgetType = 'home'
): Promise<Budget[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('year', year)
    .eq('budget_type', budgetType)
    .order('month')

  if (error) throw new Error(error.message)
  return (data || []) as Budget[]
}

// ===== PLANNED AMOUNTS =====

export async function getPlannedAmounts(budgetId: string): Promise<PlannedAmount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('planned_amounts')
    .select('*')
    .eq('budget_id', budgetId)

  if (error) throw new Error(error.message)
  return (data || []) as PlannedAmount[]
}

export async function upsertPlannedAmount(input: {
  budget_id: string
  category_id: string
  amount: number
}): Promise<PlannedAmount> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('planned_amounts')
    .select('id')
    .eq('budget_id', input.budget_id)
    .eq('category_id', input.category_id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('planned_amounts')
      .update({ amount: input.amount })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as PlannedAmount
  } else {
    const { data, error } = await supabase
      .from('planned_amounts')
      .insert(input)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as PlannedAmount
  }
}
