import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]

const TYPE_LABELS: Record<string, string> = {
  income: 'Przychód',
  expense: 'Wydatek',
  savings: 'Oszczędność',
}

export async function exportToExcel(year: number) {
  const supabase = createClient()

  // Fetch data
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, month')
    .eq('year', year)
    .eq('budget_type', 'home')
    .order('month')

  const budgetIds = (budgets || []).map(b => b.id)
  const budgetMonthMap = new Map((budgets || []).map(b => [b.id, b.month]))

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type, parent_id')
    .eq('is_active', true)
    .order('sort_order')

  const catMap = new Map((categories || []).map(c => [c.id, c]))

  let transactions: Array<{ budget_id: string; category_id: string; amount: number; date: string; description: string | null }> = []
  if (budgetIds.length > 0) {
    const { data } = await supabase
      .from('transactions')
      .select('budget_id, category_id, amount, date, description')
      .in('budget_id', budgetIds)
      .order('date')
    transactions = data || []
  }

  let plannedAmounts: Array<{ budget_id: string; category_id: string; amount: number }> = []
  if (budgetIds.length > 0) {
    const { data } = await supabase
      .from('planned_amounts')
      .select('budget_id, category_id, amount')
      .in('budget_id', budgetIds)
    plannedAmounts = data || []
  }

  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summaryRows: Record<string, unknown>[] = []
  for (let m = 1; m <= 12; m++) {
    let income = 0, expenses = 0, savings = 0, planned = 0
    const budgetEntry = (budgets || []).find(b => b.month === m)
    if (budgetEntry) {
      for (const pa of plannedAmounts) {
        if (pa.budget_id === budgetEntry.id) planned += Number(pa.amount)
      }
      for (const tx of transactions) {
        if (tx.budget_id === budgetEntry.id) {
          const cat = catMap.get(tx.category_id)
          const amount = Number(tx.amount)
          if (cat?.type === 'income') income += amount
          else if (cat?.type === 'expense') expenses += amount
          else if (cat?.type === 'savings') savings += amount
        }
      }
    }
    summaryRows.push({
      'Miesiąc': MONTH_NAMES[m - 1],
      'Przychody': income,
      'Plan wydatków': planned,
      'Wydatki': expenses,
      'Oszczędności': savings,
      'Różnica': planned - expenses,
    })
  }
  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, ws1, `Podsumowanie ${year}`)

  // Sheet 2: Transactions
  const txRows = transactions.map(tx => {
    const cat = catMap.get(tx.category_id)
    const parentCat = cat?.parent_id ? catMap.get(cat.parent_id) : null
    const txMonth = budgetMonthMap.get(tx.budget_id) || 0
    return {
      'Data': tx.date,
      'Miesiąc': MONTH_NAMES[txMonth - 1] || '',
      'Kategoria': parentCat ? parentCat.name : (cat?.name || ''),
      'Podkategoria': parentCat ? (cat?.name || '') : '',
      'Typ': TYPE_LABELS[cat?.type || ''] || cat?.type || '',
      'Kwota': Number(tx.amount),
      'Opis': tx.description || '',
    }
  })
  const ws2 = XLSX.utils.json_to_sheet(txRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Transakcje')

  // Sheet 3: Categories
  const catPlanned: Record<string, number> = {}
  const catActual: Record<string, number> = {}
  for (const pa of plannedAmounts) catPlanned[pa.category_id] = (catPlanned[pa.category_id] || 0) + Number(pa.amount)
  for (const tx of transactions) catActual[tx.category_id] = (catActual[tx.category_id] || 0) + Number(tx.amount)

  const catRows: Record<string, unknown>[] = []
  const parents = (categories || []).filter(c => !c.parent_id)
  for (const parent of parents) {
    const children = (categories || []).filter(c => c.parent_id === parent.id)
    if (children.length === 0) {
      const pln = catPlanned[parent.id] || 0
      const act = catActual[parent.id] || 0
      catRows.push({
        'Kategoria': parent.name,
        'Podkategoria': '',
        'Typ': TYPE_LABELS[parent.type] || parent.type,
        'Plan roczny': pln,
        'Łącznie wydane': act,
        'Różnica': pln - act,
      })
    } else {
      for (const child of children) {
        const pln = catPlanned[child.id] || 0
        const act = catActual[child.id] || 0
        catRows.push({
          'Kategoria': parent.name,
          'Podkategoria': child.name,
          'Typ': TYPE_LABELS[parent.type] || parent.type,
          'Plan roczny': pln,
          'Łącznie wydane': act,
          'Różnica': pln - act,
        })
      }
    }
  }
  const ws3 = XLSX.utils.json_to_sheet(catRows)
  XLSX.utils.book_append_sheet(wb, ws3, 'Kategorie')

  // Download
  XLSX.writeFile(wb, `BudzetApp_${year}.xlsx`)
}
