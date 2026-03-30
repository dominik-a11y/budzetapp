'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, Trash2, Loader2 } from 'lucide-react'
import { getDocuments, deleteDocument } from '@/lib/actions/documents'
import type { Document } from '@/types/budget'

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'pending' | 'error'>('all')

  const loadDocuments = async () => {
    try {
      setError(null)
      const docs = await getDocuments()
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania dokumentów')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania dokumentu')
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.ocr_vendor_name || doc.file_path || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = filteredDocuments.reduce((sum, doc) => sum + (doc.ocr_total || 0), 0)
  const processedCount = documents.filter(d => d.status === 'processed').length
  const pendingCount = documents.filter(d => d.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6c5ce7] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Dokumenty</h1>
        <p className="text-[#999]">Archiwum skanowanych paragonów i faktur</p>
      </div>

      {error && (
        <div className="p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#666]" />
          <input
            type="text"
            placeholder="Szukaj dokumentu, sprzedawcy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141418] border border-[#2a2a35] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#6c5ce7]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip label="Wszystkie" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          <FilterChip label={`Przetworzone (${processedCount})`} active={statusFilter === 'processed'} onClick={() => setStatusFilter('processed')} />
          <FilterChip label={`Oczekujące (${pendingCount})`} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">Dokumentów</p>
            <p className="text-2xl font-bold text-[#ededed]">{filteredDocuments.length}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">Łączna kwota</p>
            <p className="text-2xl font-bold text-[#a29bfe]">
              {totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">Średnia</p>
            <p className="text-2xl font-bold text-[#74b9ff]">
              {(totalAmount / (filteredDocuments.length || 1)).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
            </p>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
          <p className="text-[#666] mb-2">Brak dokumentów</p>
          <p className="text-[#999] text-sm">Skanuj paragon, aby dodać nowy dokument</p>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
        active
          ? 'bg-[#6c5ce7] text-white'
          : 'bg-[#1e1e24] text-[#999] hover:bg-[#2a2a35]'
      }`}
    >
      {label}
    </button>
  )
}

function DocumentCard({
  document: doc,
  onDelete,
}: {
  document: Document
  onDelete: (id: string) => void
}) {
  const statusLabels: Record<string, string> = {
    processed: 'Przetworzony',
    pending: 'Oczekuje',
    error: 'Błąd',
  }
  const statusColors: Record<string, string> = {
    processed: 'bg-[#00b894]',
    pending: 'bg-[#fdcb6e]',
    error: 'bg-[#e17055]',
  }

  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden hover:border-[#6c5ce7] transition">
      {/* Preview */}
      <div className="aspect-video bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
        <FileText className="w-12 h-12 text-white opacity-50" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#ededed] truncate">
            {doc.ocr_vendor_name || 'Nieznany sprzedawca'}
          </h3>
          <button
            onClick={() => onDelete(doc.id)}
            className="p-1 hover:bg-[#2a2a35] rounded transition"
          >
            <Trash2 className="w-4 h-4 text-[#e17055]" />
          </button>
        </div>

        <p className="text-xs text-[#666] truncate">{doc.file_type} &bull; {doc.file_path.split('/').pop()}</p>

        {doc.ocr_nip && (
          <p className="text-xs text-[#666]">NIP sprzedawcy: {doc.ocr_nip}</p>
        )}
        {doc.ocr_buyer_nip && (
          <p className="text-xs text-[#a29bfe] font-medium">Firmowy — NIP nabywcy: {doc.ocr_buyer_nip}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#2a2a35]">
          <div>
            <p className="text-xs text-[#666] mb-1">
              {doc.ocr_date
                ? new Date(doc.ocr_date).toLocaleDateString('pl-PL')
                : new Date(doc.uploaded_at).toLocaleDateString('pl-PL')}
            </p>
            {doc.ocr_total != null && (
              <p className="text-lg font-bold text-[#a29bfe]">
                {Number(doc.ocr_total).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
              </p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColors[doc.status] || 'bg-[#666]'}`}>
            {statusLabels[doc.status] || doc.status}
          </span>
        </div>
      </div>
    </div>
  )
}
