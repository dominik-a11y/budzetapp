'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, Check, X, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/lib/actions/categories'
import { getOrCreateBudget } from '@/lib/actions/budgets'
import { createTransaction } from '@/lib/actions/transactions'
import type { CategoryWithChildren, Category } from '@/types/budget'

interface OCRResult {
  vendor_name: string
  vendor_nip?: string | null
  date: string
  total_amount: number
  suggested_category: string
  items: Array<{ name: string; price: number }>
  confidence: number
  document_id?: string | null
}

interface InvoiceRow {
  fileName: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  ocr?: OCRResult
  categoryId: string
  editedAmount: string
  editedDate: string
  editedVendor: string
  selected: boolean
}

export default function ImportInvoicesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [processing, setProcessing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importResults, setImportResults] = useState({ ok: 0, errors: 0 })

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const expenseCategories: Category[] = categories
    .filter(c => c.type === 'expense')
    .flatMap(parent => parent.children.length > 0 ? parent.children : [parent as Category])

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    setFiles(prev => [...prev, ...selected])
    setRows(prev => [
      ...prev,
      ...selected.map(f => ({
        fileName: f.name,
        status: 'pending' as const,
        categoryId: '',
        editedAmount: '',
        editedDate: '',
        editedVendor: '',
        selected: true,
      })),
    ])

    // Reset input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    if (dropped.length === 0) return

    setFiles(prev => [...prev, ...dropped])
    setRows(prev => [
      ...prev,
      ...dropped.map(f => ({
        fileName: f.name,
        status: 'pending' as const,
        categoryId: '',
        editedAmount: '',
        editedDate: '',
        editedVendor: '',
        selected: true,
      })),
    ])
  }

  const removeRow = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const processAll = async () => {
    setProcessing(true)

    for (let i = 0; i < files.length; i++) {
      if (rows[i].status !== 'pending') continue

      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing' } : r))

      try {
        const formData = new FormData()
        formData.append('file', files[i])

        const response = await fetch('/api/ocr', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          setRows(prev => prev.map((r, idx) => idx === i ? {
            ...r,
            status: 'error',
            error: data.error || 'Błąd OCR',
          } : r))
          continue
        }

        // Auto-match category
        let matchedCategoryId = ''
        if (data.suggested_category) {
          const match = expenseCategories.find(
            c => c.name.toLowerCase().includes(data.suggested_category.toLowerCase())
          )
          if (match) matchedCategoryId = match.id
        }

        setRows(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'done',
          ocr: data,
          categoryId: matchedCategoryId,
          editedAmount: String(data.total_amount || ''),
          editedDate: data.date || '',
          editedVendor: data.vendor_name || '',
        } : r))
      } catch (err) {
        setRows(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'error',
          error: err instanceof Error ? err.message : 'Nieznany błąd',
        } : r))
      }
    }

    setProcessing(false)
  }

  const updateRow = (index: number, updates: Partial<InvoiceRow>) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

  const readyRows = rows.filter(r => r.status === 'done' && r.selected && r.categoryId && r.editedAmount && r.editedDate)
  const doneRows = rows.filter(r => r.status === 'done')
  const errorRows = rows.filter(r => r.status === 'error')
  const pendingRows = rows.filter(r => r.status === 'pending')

  const handleImportAll = async () => {
    if (readyRows.length === 0) return
    setImporting(true)

    let ok = 0
    let errors = 0

    for (const row of readyRows) {
      try {
        const date = new Date(row.editedDate)
        const budget = await getOrCreateBudget(date.getFullYear(), date.getMonth() + 1)

        await createTransaction({
          budget_id: budget.id,
          category_id: row.categoryId,
          amount: parseFloat(row.editedAmount),
          date: row.editedDate,
          description: row.editedVendor || undefined,
          document_id: row.ocr?.document_id || undefined,
        })
        ok++
      } catch {
        errors++
      }
    }

    setImportResults({ ok, errors })
    setImporting(false)
    setImportDone(true)
  }

  // Done screen
  if (importDone) {
    return (
      <div className="space-y-6 pb-20 md:pb-8">
        <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#00b894]/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-[#00b894]" />
          </div>
          <p className="text-[#ededed] font-semibold text-lg">Import zakończony</p>
          <p className="text-[#999] text-sm">
            Zaimportowano {importResults.ok} faktur
            {importResults.errors > 0 && `, ${importResults.errors} błędów`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold py-3 rounded-lg transition"
          >
            Przejdź do dashboardu
          </button>
          <button
            onClick={() => { setRows([]); setFiles([]); setImportDone(false); setImportResults({ ok: 0, errors: 0 }) }}
            className="flex-1 bg-[#1e1e24] hover:bg-[#2a2a35] text-[#ededed] font-semibold py-3 rounded-lg border border-[#2a2a35] transition"
          >
            Importuj kolejne
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Import faktur</h1>
        <p className="text-[#999]">
          Wrzuć pliki PDF lub zdjęcia faktur — Claude rozpozna dane z każdej
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#2a2a35] hover:border-[#6c5ce7] rounded-lg p-8 text-center cursor-pointer transition group"
      >
        <Upload className="w-10 h-10 text-[#666] group-hover:text-[#6c5ce7] mx-auto mb-3 transition" />
        <p className="text-[#ededed] font-semibold mb-1">Przeciągnij pliki lub kliknij, aby wybrać</p>
        <p className="text-[#666] text-sm">PDF, JPG, PNG — możesz wybrać wiele plików naraz</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={handleFilesSelect}
        className="hidden"
      />

      {/* File list */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-[#ededed] font-medium">{rows.length} plików</span>
              {doneRows.length > 0 && <span className="text-[#00b894]">{doneRows.length} rozpoznanych</span>}
              {errorRows.length > 0 && <span className="text-[#e17055]">{errorRows.length} błędów</span>}
              {pendingRows.length > 0 && <span className="text-[#999]">{pendingRows.length} oczekujących</span>}
            </div>

            {pendingRows.length > 0 && !processing && (
              <button
                onClick={processAll}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Rozpoznaj wszystkie ({pendingRows.length})</span>
              </button>
            )}

            {processing && (
              <div className="flex items-center space-x-2 text-[#6c5ce7] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Przetwarzanie...</span>
              </div>
            )}
          </div>

          {/* Invoice cards */}
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={`bg-[#141418] rounded-lg border overflow-hidden transition ${
                  row.status === 'error' ? 'border-[#e17055]/30' :
                  row.status === 'done' ? 'border-[#2a2a35]' :
                  row.status === 'processing' ? 'border-[#6c5ce7]/30' :
                  'border-[#2a2a35]'
                }`}
              >
                {/* File header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {row.status === 'processing' && <Loader2 className="w-4 h-4 text-[#6c5ce7] animate-spin flex-shrink-0" />}
                    {row.status === 'done' && <Check className="w-4 h-4 text-[#00b894] flex-shrink-0" />}
                    {row.status === 'error' && <AlertCircle className="w-4 h-4 text-[#e17055] flex-shrink-0" />}
                    {row.status === 'pending' && <FileText className="w-4 h-4 text-[#666] flex-shrink-0" />}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#ededed] truncate">{row.fileName}</p>
                      {row.status === 'error' && <p className="text-xs text-[#e17055]">{row.error}</p>}
                      {row.status === 'processing' && <p className="text-xs text-[#6c5ce7]">Rozpoznawanie...</p>}
                      {row.status === 'pending' && <p className="text-xs text-[#666]">Oczekuje na rozpoznanie</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {row.status === 'done' && (
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => updateRow(idx, { selected: !row.selected })}
                        className="accent-[#6c5ce7]"
                      />
                    )}
                    <button onClick={() => removeRow(idx)} className="p-1.5 hover:bg-[#2a2a35] rounded transition">
                      <Trash2 className="w-4 h-4 text-[#666]" />
                    </button>
                  </div>
                </div>

                {/* OCR result form */}
                {row.status === 'done' && row.ocr && (
                  <div className="border-t border-[#2a2a35] p-4 bg-[#1e1e24]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-[#666] mb-1">Sprzedawca</label>
                        <input
                          type="text"
                          value={row.editedVendor}
                          onChange={(e) => updateRow(idx, { editedVendor: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#141418] border border-[#2a2a35] rounded text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#666] mb-1">Data</label>
                        <input
                          type="date"
                          value={row.editedDate}
                          onChange={(e) => updateRow(idx, { editedDate: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#141418] border border-[#2a2a35] rounded text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#666] mb-1">Kwota (zł)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.editedAmount}
                          onChange={(e) => updateRow(idx, { editedAmount: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#141418] border border-[#2a2a35] rounded text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#666] mb-1">Kategoria</label>
                        <select
                          value={row.categoryId}
                          onChange={(e) => updateRow(idx, { categoryId: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#141418] border border-[#2a2a35] rounded text-sm text-[#ededed] focus:outline-none focus:border-[#6c5ce7]"
                        >
                          <option value="">Wybierz...</option>
                          {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {row.ocr.vendor_nip && (
                      <p className="text-xs text-[#666] mt-2">NIP: {row.ocr.vendor_nip}</p>
                    )}
                    {row.ocr.confidence && (
                      <p className="text-xs text-[#666] mt-1">Pewność: {(row.ocr.confidence * 100).toFixed(0)}%</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Import button */}
          {doneRows.length > 0 && !processing && (
            <div className="flex items-center space-x-4">
              <button
                onClick={handleImportAll}
                disabled={readyRows.length === 0 || importing}
                className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-[#00b894] to-[#55efc4] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Importowanie...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Importuj {readyRows.length} faktur jako transakcje</span>
                  </>
                )}
              </button>
            </div>
          )}

          {readyRows.length === 0 && doneRows.length > 0 && !processing && (
            <div className="p-3 bg-[#6c5ce7]/10 border border-[#6c5ce7]/30 rounded-lg text-sm text-[#a29bfe] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Przypisz kategorię, kwotę i datę do zaznaczonych faktur, aby móc je zaimportować.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
