'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, FileSpreadsheet, Check, X, Loader2, AlertCircle, ArrowRight, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { parseCSV, type ParsedTransaction } from '@/lib/csv-parser'
import { getCategories } from '@/lib/actions/categories'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { createTransaction } from '@/lib/actions/transactions'
import type { CategoryWithChildren, Category } from '@/types/budget'

interface ImportRow extends ParsedTransaction {
  selected: boolean
  categoryId: string
  type: 'income' | 'expense'
}

export default function ImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [fileName, setFileName] = useState('')
  const [bank, setBank] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importErrors, setImportErrors] = useState<string[]>([])

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const expenseCategories: Category[] = categories
    .filter(c => c.type === 'expense')
    .flatMap(parent => parent.children.length > 0 ? parent.children : [parent as Category])

  const incomeCategories: Category[] = categories
    .filter(c => c.type === 'income')
    .flatMap(parent => parent.children.length > 0 ? parent.children : [parent as Category])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const result = parseCSV(text)

      setBank(result.bank)
      setErrors(result.errors)

      if (result.transactions.length > 0) {
        setRows(result.transactions.map(tx => ({
          ...tx,
          selected: true,
          categoryId: '',
          type: tx.amount < 0 ? 'expense' : 'income',
        })))
        setStep('preview')
      }
    }

    // Try UTF-8 first, if it has garbled characters user can re-upload
    reader.readAsText(file, 'UTF-8')
  }, [])

  const toggleRow = (index: number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, selected: !r.selected } : r))
  }

  const toggleAll = () => {
    const allSelected = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  const setCategoryForRow = (index: number, categoryId: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, categoryId } : r))
  }

  const setTypeForRow = (index: number, type: 'income' | 'expense') => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, type, categoryId: '' } : r))
  }

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const selectedRows = rows.filter(r => r.selected)
  const readyToImport = selectedRows.length > 0 && selectedRows.every(r => r.categoryId)

  const handleImport = async () => {
    const toImport = rows.filter(r => r.selected && r.categoryId)
    if (toImport.length === 0) return

    setImporting(true)
    setStep('importing')
    setImportProgress({ done: 0, total: toImport.length })
    const errs: string[] = []

    // Group by year+month for budget creation
    const byMonth = new Map<string, ImportRow[]>()
    for (const row of toImport) {
      const d = new Date(row.date)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(row)
    }

    let done = 0
    for (const [key, monthRows] of byMonth) {
      const [yearStr, monthStr] = key.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)

      try {
        const budget = await getOrCreateBudget(year, month)

        for (const row of monthRows) {
          try {
            await createTransaction({
              budget_id: budget.id,
              category_id: row.categoryId,
              amount: Math.abs(row.amount),
              date: row.date,
              description: row.description || undefined,
            })
          } catch (err) {
            errs.push(`${row.date} ${row.description}: ${err instanceof Error ? err.message : 'błąd'}`)
          }
          done++
          setImportProgress({ done, total: toImport.length })
        }
      } catch (err) {
        errs.push(`Budżet ${monthStr}/${yearStr}: ${err instanceof Error ? err.message : 'błąd'}`)
      }
    }

    setImportErrors(errs)
    setImporting(false)
    setStep('done')
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Import wyciągu bankowego</h1>
        <p className="text-[#999]">
          Zaimportuj transakcje z pliku CSV wyeksportowanego z banku
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-[#ff7675] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </p>
          ))}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2a2a35] hover:border-[#6c5ce7] rounded-lg p-12 text-center cursor-pointer transition group"
          >
            <Upload className="w-12 h-12 text-[#666] group-hover:text-[#6c5ce7] mx-auto mb-4 transition" />
            <p className="text-[#ededed] font-semibold mb-2">Przeciągnij plik CSV lub kliknij, aby wybrać</p>
            <p className="text-[#666] text-sm">
              Obsługiwane banki: mBank, PKO BP, ING, Santander, Millennium i inne formaty CSV
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-6">
            <h3 className="text-sm font-semibold text-[#ededed] mb-3">Jak wyeksportować wyciąg?</h3>
            <div className="space-y-2 text-sm text-[#999]">
              <p>1. Zaloguj się do bankowości internetowej</p>
              <p>2. Przejdź do historii transakcji</p>
              <p>3. Wybierz zakres dat</p>
              <p>4. Wyeksportuj jako CSV (lub plik tekstowy)</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* File info */}
          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-[#6c5ce7]" />
              <div>
                <p className="text-sm font-medium text-[#ededed]">{fileName}</p>
                <p className="text-xs text-[#666]">
                  Rozpoznano: {bank} &bull; {rows.length} transakcji
                </p>
              </div>
            </div>
            <button
              onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
              className="text-sm text-[#999] hover:text-[#ededed] transition"
            >
              Zmień plik
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4">
              <p className="text-xs text-[#666] mb-1">Zaznaczonych</p>
              <p className="text-xl font-bold text-[#ededed]">{selectedRows.length} / {rows.length}</p>
            </div>
            <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4">
              <p className="text-xs text-[#666] mb-1">Przychody</p>
              <p className="text-xl font-bold text-[#00b894]">
                {selectedRows.filter(r => r.type === 'income').reduce((s, r) => s + Math.abs(r.amount), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
              </p>
            </div>
            <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4">
              <p className="text-xs text-[#666] mb-1">Wydatki</p>
              <p className="text-xl font-bold text-[#e17055]">
                {selectedRows.filter(r => r.type === 'expense').reduce((s, r) => s + Math.abs(r.amount), 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
              </p>
            </div>
          </div>

          {/* Bulk category assign hint */}
          {selectedRows.some(r => !r.categoryId) && (
            <div className="p-3 bg-[#6c5ce7]/10 border border-[#6c5ce7]/30 rounded-lg text-sm text-[#a29bfe] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Przypisz kategorię do każdej zaznaczonej transakcji przed importem.</span>
            </div>
          )}

          {/* Transactions table */}
          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_100px_1fr_120px_180px_40px] md:grid-cols-[40px_100px_1fr_120px_180px_40px] gap-2 p-3 border-b border-[#2a2a35] bg-[#1e1e24] text-xs font-semibold text-[#999]">
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rows.every(r => r.selected)}
                  onChange={toggleAll}
                  className="accent-[#6c5ce7]"
                />
              </div>
              <div>Data</div>
              <div>Opis</div>
              <div className="text-right">Kwota</div>
              <div>Kategoria</div>
              <div></div>
            </div>

            {/* Rows */}
            <div className="max-h-[500px] overflow-y-auto divide-y divide-[#2a2a35]">
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-[40px_100px_1fr_120px_180px_40px] gap-2 p-3 items-center transition ${
                    row.selected ? 'bg-[#141418]' : 'bg-[#141418] opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRow(idx)}
                      className="accent-[#6c5ce7]"
                    />
                  </div>
                  <div className="text-xs text-[#ededed]">
                    {new Date(row.date).toLocaleDateString('pl-PL')}
                  </div>
                  <div className="text-xs text-[#999] truncate" title={row.description}>
                    {row.description || '—'}
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => setTypeForRow(idx, row.type === 'income' ? 'expense' : 'income')}
                      className={`text-xs font-semibold ${
                        row.type === 'income' ? 'text-[#00b894]' : 'text-[#e17055]'
                      }`}
                      title="Kliknij, aby zmienić typ"
                    >
                      {row.type === 'income' ? '+' : '−'}{Math.abs(row.amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
                    </button>
                  </div>
                  <div>
                    <select
                      value={row.categoryId}
                      onChange={(e) => setCategoryForRow(idx, e.target.value)}
                      className="w-full px-2 py-1 bg-[#1e1e24] border border-[#2a2a35] rounded text-xs text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                    >
                      <option value="">Wybierz...</option>
                      {(row.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 hover:bg-[#2a2a35] rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#666] hover:text-[#e17055]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleImport}
              disabled={!readyToImport}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Importuj {selectedRows.filter(r => r.categoryId).length} transakcji</span>
            </button>
            <button
              onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
              className="px-6 py-3 text-[#999] hover:text-[#ededed] transition font-medium"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#6c5ce7] animate-spin mx-auto" />
          <p className="text-[#ededed] font-semibold">Importowanie transakcji...</p>
          <p className="text-[#999] text-sm">
            {importProgress.done} / {importProgress.total}
          </p>
          <div className="w-full max-w-md mx-auto bg-[#1e1e24] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] transition-all"
              style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="space-y-6">
          <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#00b894]/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-[#00b894]" />
            </div>
            <p className="text-[#ededed] font-semibold text-lg">Import zakończony</p>
            <p className="text-[#999] text-sm">
              Zaimportowano {importProgress.done - importErrors.length} z {importProgress.total} transakcji
            </p>
          </div>

          {importErrors.length > 0 && (
            <div className="bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg p-4 space-y-1">
              <p className="text-sm font-semibold text-[#ff7675] mb-2">Błędy ({importErrors.length}):</p>
              {importErrors.map((err, i) => (
                <p key={i} className="text-xs text-[#ff7675]">{err}</p>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition"
            >
              Przejdź do dashboardu
            </button>
            <button
              onClick={() => { setStep('upload'); setRows([]); setFileName(''); setImportErrors([]); }}
              className="flex-1 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
            >
              Importuj kolejny plik
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
