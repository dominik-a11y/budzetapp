// ===== ENUMS =====
export type CategoryType = 'income' | 'expense' | 'savings'
export type AccountType = 'cash' | 'checking' | 'savings' | 'investment'
export type BudgetType = 'home' | 'business'
export type DocumentStatus = 'pending' | 'processed' | 'error'

// ===== DATABASE MODELS =====

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  default_currency: string
  created_at: string
}

export interface BudgetSettings {
  id: string
  user_id: string
  current_year: number
  start_day_of_month: number
  show_business: boolean
}

export interface Budget {
  id: string
  user_id: string
  year: number
  month: number
  budget_type: BudgetType
  notes: string | null
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  parent_id: string | null
  sort_order: number
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface CategoryWithChildren extends Category {
  children: Category[]
}

export interface Transaction {
  id: string
  budget_id: string
  category_id: string
  amount: number
  date: string
  description: string | null
  document_id: string | null
  created_at: string
  // joined
  category?: Category
}

export interface PlannedAmount {
  id: string
  budget_id: string
  category_id: string
  amount: number
}

export interface Account {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface AccountBalance {
  id: string
  account_id: string
  year: number
  month: number
  balance: number
}

export interface Document {
  id: string
  user_id: string
  file_path: string
  file_type: string
  file_size: number | null
  thumbnail_path: string | null
  ocr_raw: Record<string, unknown> | null
  ocr_vendor_name: string | null
  ocr_total: number | null
  ocr_date: string | null
  ocr_nip: string | null
  ocr_category_suggestion: string | null
  status: DocumentStatus
  uploaded_at: string
}

// ===== VIEW MODELS =====

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
