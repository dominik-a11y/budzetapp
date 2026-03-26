export interface Budget {
  id: string
  user_id: string
  year: number
  month: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  budget_id: string
  category_id: string
  amount: number
  description: string
  date: string
  type: 'income' | 'expense' | 'savings'
  document_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  parent_id?: string
  name: string
  type: 'income' | 'expense' | 'savings'
  order: number
  color?: string
  icon?: string
  created_at: string
  updated_at: string
}

export interface PlannedAmount {
  id: string
  budget_id: string
  category_id: string
  planned_amount: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  vendor_name?: string
  vendor_nip?: string
  transaction_date?: string
  total_amount?: number
  recognized_items?: Record<string, unknown>[]
  status: 'pending' | 'assigned' | 'archived'
  confidence?: number
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'credit_card' | 'cash'
  currency: string
  is_active: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface AccountBalance {
  id: string
  account_id: string
  balance: number
  date: string
  created_at: string
  updated_at: string
}

export interface CategoryBudget {
  category_id: string
  category_name: string
  planned: number
  actual: number
  remaining: number
  percentage: number
}

export interface MonthSummary {
  month: number
  year: number
  total_income: number
  total_expenses: number
  total_savings: number
  remaining: number
}
