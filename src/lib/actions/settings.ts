import { createClient } from '@/lib/supabase/client'
import type { BudgetSettings, Profile } from '@/types/budget'

export async function getSettings(): Promise<BudgetSettings | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as BudgetSettings | null
}

export async function updateSettings(input: {
  current_year?: number
  start_day_of_month?: number
  show_business?: boolean
}): Promise<BudgetSettings> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data, error } = await supabase
    .from('budget_settings')
    .update(input)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as BudgetSettings
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Profile | null
}

export async function updateProfile(input: {
  display_name?: string
  avatar_url?: string | null
}): Promise<Profile> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Profile
}
