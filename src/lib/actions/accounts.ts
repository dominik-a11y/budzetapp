import { createClient } from '@/lib/supabase/client'
import type { Account, AccountBalance } from '@/types/budget'

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return (data || []) as Account[]
}

export async function createAccount(input: {
  name: string
  account_type: Account['account_type']
}): Promise<Account> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data: existing } = await supabase
    .from('accounts')
    .select('sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name: input.name,
      account_type: input.account_type,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Account
}

export async function updateAccount(
  id: string,
  input: { name?: string; account_type?: Account['account_type']; sort_order?: number }
): Promise<Account> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Account
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ===== BALANCES =====

export async function getAccountBalances(
  accountId: string,
  year?: number
): Promise<AccountBalance[]> {
  const supabase = createClient()

  let query = supabase
    .from('account_balances')
    .select('*')
    .eq('account_id', accountId)
    .order('year')
    .order('month')

  if (year) {
    query = query.eq('year', year)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as AccountBalance[]
}

export async function upsertAccountBalance(input: {
  account_id: string
  year: number
  month: number
  balance: number
}): Promise<AccountBalance> {
  const supabase = createClient()

  // Check if balance exists for this account/year/month
  const { data: existing } = await supabase
    .from('account_balances')
    .select('id')
    .eq('account_id', input.account_id)
    .eq('year', input.year)
    .eq('month', input.month)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('account_balances')
      .update({ balance: input.balance })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as AccountBalance
  } else {
    const { data, error } = await supabase
      .from('account_balances')
      .insert(input)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as AccountBalance
  }
}
