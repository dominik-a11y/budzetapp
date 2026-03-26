import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

const MONTH_NAMES = [
  'Stycze\u0144', 'Luty', 'Marzec', 'Kwiecie\u0144', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpie\u0144', 'Wrzesie\u0144', 'Pa\u017adziernik', 'Listopad', 'Grudzie\u0144',
]

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: '6C5CE7' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFF' },
  size: 11,
}

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  left: { style: 'thin', color: { argb: 'CCCCCC' } },
  right: { style: 'thin', color: { argb: 'CCCCCC' } },
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const monthParam = searchParams.get('month')

    // Fetch budgets for the year
    const { data: budgets } = await supabase
      .from('budgets')
      .select('id, month')
      .eq('year', year)
      .eq('budget_type', 'home')
      .order('month')

    const budgetIds = (budgets || []).map(b => b.id)
    const budgetMonthMap = new Map((budgets || []).map(b => [b.id, b.month]))

    // Fetch categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, type, parent_id')
      .eq('is_active', true)
      .order('sort_order')

    const catMap = new Map((categories || []).map(c => [c.id, c]))

    // Fetch transactions
    let transactions: Array<{ budget_id: string; category_id: string; amount: number; date: string; description: string | null }> = []
    if (budgetIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select('budget_id, category_id, amount, date, description')
        .in('budget_id', budgetIds)
        .order('date')
      transactions = txData || []
    }

    // Fetch planned amounts
    let plannedAmounts: Array<{ budget_id: string; category_id: string; amount: number }> = []
    if (budgetIds.length > 0) {
      const { data: paData } = await supabase
        .from('planned_amounts')
        .select('budget_id, category_id, amount')
        .in('budget_id', budgetIds)
      plannedAmounts = paData || []
    }

    // Build workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Bud\u017cetApp'
    workbook.created = new Date()

    // ============================
    // SHEET 1: Podsumowanie roczne
    // ============================
    const summarySheet = workbook.addWorksheet('Podsumowanie ' + year)
    summarySheet.columns = [
      { header: 'Miesi\u0105c', key: 'month', width: 16 },
      { header: 'Przychody', key: 'income', width: 16 },
      { header: 'Plan wydatk\u00f3w', key: 'planned', width: 16 },
      { header: 'Wydatki', key: 'expenses', width: 16 },
      { header: 'Oszcz\u0119dno\u015bci', key: 'savings', width: 16 },
      { header: 'R\u00f3\u017cnica', key: 'difference', width: 16 },
    ]

    // Style header
    summarySheet.getRow(1).eachCell(cell => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = BORDER_STYLE
      cell.alignment = { horizontal: 'center' }
    })

    // Aggregate per month
    for (let m = 1; m <= 12; m++) {
      if (monthParam && parseInt(monthParam) !== m) continue

      let income = 0, expenses = 0, savings = 0, planned = 0

      // Find budget for this month
      const budgetEntry = (budgets || []).find(b => b.month === m)
      if (budgetEntry) {
        // Sum planned
        for (const pa of plannedAmounts) {
          if (pa.budget_id === budgetEntry.id) planned += Number(pa.amount)
        }
        // Sum transactions
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

      const row = summarySheet.addRow({
        month: MONTH_NAMES[m - 1],
        income,
        planned,
        expenses,
        savings,
        difference: planned - expenses,
      })

      row.eachCell((cell, colNumber) => {
        cell.border = BORDER_STYLE
        if (colNumber >= 2) {
          cell.numFmt = '#,##0.00 "z\u0142"'
          cell.alignment = { horizontal: 'right' }
        }
        // Red if over budget
        if (colNumber === 6 && planned - expenses < 0) {
          cell.font = { color: { argb: 'E17055' }, bold: true }
        }
      })
    }

    // Total row
    const dataRowCount = summarySheet.rowCount - 1
    if (dataRowCount > 0) {
      const totalRow = summarySheet.addRow({
        month: 'RAZEM',
        income: { formula: `SUM(B2:B${dataRowCount + 1})` },
        planned: { formula: `SUM(C2:C${dataRowCount + 1})` },
        expenses: { formula: `SUM(D2:D${dataRowCount + 1})` },
        savings: { formula: `SUM(E2:E${dataRowCount + 1})` },
        difference: { formula: `SUM(F2:F${dataRowCount + 1})` },
      })
      totalRow.eachCell(cell => {
        cell.font = { bold: true, size: 11 }
        cell.border = BORDER_STYLE
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } }
      })
      totalRow.getCell(1).alignment = { horizontal: 'left' }
      for (let i = 2; i <= 6; i++) {
        totalRow.getCell(i).numFmt = '#,##0.00 "z\u0142"'
        totalRow.getCell(i).alignment = { horizontal: 'right' }
      }
    }

    // ============================
    // SHEET 2: Transakcje
    // ============================
    const txSheet = workbook.addWorksheet('Transakcje')
    txSheet.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Miesi\u0105c', key: 'month', width: 14 },
      { header: 'Kategoria', key: 'category', width: 22 },
      { header: 'Podkategoria', key: 'subcategory', width: 22 },
      { header: 'Typ', key: 'type', width: 14 },
      { header: 'Kwota', key: 'amount', width: 16 },
      { header: 'Opis', key: 'description', width: 30 },
    ]

    txSheet.getRow(1).eachCell(cell => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = BORDER_STYLE
      cell.alignment = { horizontal: 'center' }
    })

    const typeLabels: Record<string, string> = { income: 'Przych\u00f3d', expense: 'Wydatek', savings: 'Oszcz\u0119dno\u015b\u0107' }

    for (const tx of transactions) {
      const cat = catMap.get(tx.category_id)
      const parentCat = cat?.parent_id ? catMap.get(cat.parent_id) : null
      const txMonth = budgetMonthMap.get(tx.budget_id) || 0

      if (monthParam && txMonth !== parseInt(monthParam)) continue

      const row = txSheet.addRow({
        date: tx.date,
        month: MONTH_NAMES[txMonth - 1] || '',
        category: parentCat ? parentCat.name : (cat?.name || ''),
        subcategory: parentCat ? (cat?.name || '') : '',
        type: typeLabels[cat?.type || ''] || cat?.type || '',
        amount: Number(tx.amount),
        description: tx.description || '',
      })

      row.eachCell((cell, colNumber) => {
        cell.border = BORDER_STYLE
        if (colNumber === 6) {
          cell.numFmt = '#,##0.00 "z\u0142"'
          cell.alignment = { horizontal: 'right' }
        }
      })
    }

    // ============================
    // SHEET 3: Kategorie
    // ============================
    const catSheet = workbook.addWorksheet('Kategorie')
    catSheet.columns = [
      { header: 'Kategoria', key: 'category', width: 22 },
      { header: 'Podkategoria', key: 'subcategory', width: 22 },
      { header: 'Typ', key: 'type', width: 14 },
      { header: 'Plan roczny', key: 'planned', width: 16 },
      { header: '\u0141\u0105cznie wydane', key: 'actual', width: 16 },
      { header: 'R\u00f3\u017cnica', key: 'difference', width: 16 },
    ]

    catSheet.getRow(1).eachCell(cell => {
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = BORDER_STYLE
      cell.alignment = { horizontal: 'center' }
    })

    // Build category totals
    const catPlanned: Record<string, number> = {}
    const catActual: Record<string, number> = {}

    for (const pa of plannedAmounts) {
      if (monthParam) {
        const bMonth = budgetMonthMap.get(pa.budget_id)
        if (bMonth !== parseInt(monthParam)) continue
      }
      catPlanned[pa.category_id] = (catPlanned[pa.category_id] || 0) + Number(pa.amount)
    }

    for (const tx of transactions) {
      if (monthParam) {
        const bMonth = budgetMonthMap.get(tx.budget_id)
        if (bMonth !== parseInt(monthParam)) continue
      }
      catActual[tx.category_id] = (catActual[tx.category_id] || 0) + Number(tx.amount)
    }

    // Group by parent
    const parents = (categories || []).filter(c => !c.parent_id)
    for (const parent of parents) {
      const children = (categories || []).filter(c => c.parent_id === parent.id)

      if (children.length === 0) {
        const pln = catPlanned[parent.id] || 0
        const act = catActual[parent.id] || 0
        const row = catSheet.addRow({
          category: parent.name,
          subcategory: '',
          type: typeLabels[parent.type] || parent.type,
          planned: pln,
          actual: act,
          difference: pln - act,
        })
        row.eachCell((cell, col) => {
          cell.border = BORDER_STYLE
          if (col >= 4) {
            cell.numFmt = '#,##0.00 "z\u0142"'
            cell.alignment = { horizontal: 'right' }
          }
        })
      } else {
        for (const child of children) {
          const pln = catPlanned[child.id] || 0
          const act = catActual[child.id] || 0
          const row = catSheet.addRow({
            category: parent.name,
            subcategory: child.name,
            type: typeLabels[parent.type] || parent.type,
            planned: pln,
            actual: act,
            difference: pln - act,
          })
          row.eachCell((cell, col) => {
            cell.border = BORDER_STYLE
            if (col >= 4) {
              cell.numFmt = '#,##0.00 "z\u0142"'
              cell.alignment = { horizontal: 'right' }
            }
            if (col === 6 && pln - act < 0) {
              cell.font = { color: { argb: 'E17055' } }
            }
          })
        }
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    const fileName = monthParam
      ? `BudzetApp_${year}_${monthParam}.xlsx`
      : `BudzetApp_${year}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Export Error:', error)
    return NextResponse.json(
      { error: 'B\u0142\u0105d podczas eksportu' },
      { status: 500 }
    )
  }
}
