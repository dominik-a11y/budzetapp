'use client'

import { useState } from 'react'
import { Search, FileText, MoreVertical } from 'lucide-react'

const mockDocuments = [
  {
    id: '1',
    filename: 'Paragon_TESCO.pdf',
    date: '2026-03-25',
    amount: 125.50,
    status: 'assigned',
    vendor: 'TESCO',
  },
  {
    id: '2',
    filename: 'Rachunek_Paliwo.jpg',
    date: '2026-03-24',
    amount: 85.00,
    status: 'assigned',
    vendor: 'ORLEN',
  },
  {
    id: '3',
    filename: 'Faktura_Czynsz.pdf',
    date: '2026-03-20',
    amount: 1500.00,
    status: 'assigned',
    vendor: 'Zarządzająca',
  },
  {
    id: '4',
    filename: 'Paragon_Apteka.jpg',
    date: '2026-03-18',
    amount: 45.99,
    status: 'pending',
    vendor: 'Apteka Centralna',
  },
  {
    id: '5',
    filename: 'Rachunek_Prąd.pdf',
    date: '2026-03-15',
    amount: 245.00,
    status: 'pending',
    vendor: 'EnergiaSC',
  },
  {
    id: '6',
    filename: 'Paragon_Kino.jpg',
    date: '2026-03-12',
    amount: 68.00,
    status: 'assigned',
    vendor: 'Kino Multikino',
  },
]

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'pending'>(
    'all'
  )

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.vendor.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = filteredDocuments.reduce((sum, doc) => sum + doc.amount, 0)
  const assignedCount = filteredDocuments.filter(
    (d) => d.status === 'assigned'
  ).length
  const pendingCount = filteredDocuments.filter(
    (d) => d.status === 'pending'
  ).length

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#ededed] mb-2">Dokumenty</h1>
        <p className="text-[#999]">
          Archiwum skanowanych paragonów i faktur
        </p>
      </div>

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

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="Wszystkie"
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterChip
            label={`Przypisane (${assignedCount})`}
            active={statusFilter === 'assigned'}
            onClick={() => setStatusFilter('assigned')}
          />
          <FilterChip
            label={`Do przypisania (${pendingCount})`}
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter('pending')}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#141418] rounded-lg border border-[#2a2a35] p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">
              Dokumentów
            </p>
            <p className="text-2xl font-bold text-[#ededed]">
              {filteredDocuments.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">
              Łączna kwota
            </p>
            <p className="text-2xl font-bold text-[#a29bfe]">
              {totalAmount.toFixed(2)} zł
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#666] uppercase">
              Średnia
            </p>
            <p className="text-2xl font-bold text-[#74b9ff]">
              {(totalAmount / (filteredDocuments.length || 1)).toFixed(2)} zł
            </p>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
          <p className="text-[#666] mb-2">Brak dokumentów</p>
          <p className="text-[#999] text-sm">
            Skanuj paragon, aby dodać nowy dokument
          </p>
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
  document,
}: {
  document: {
    id: string
    filename: string
    date: string
    amount: number
    status: string
    vendor: string
  }
}) {
  const statusLabel = document.status === 'assigned' ? 'Przypisany' : 'Do przypisania'
  const statusColor =
    document.status === 'assigned' ? 'bg-[#00b894]' : 'bg-[#fdcb6e]'

  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden hover:border-[#6c5ce7] transition">
      {/* Preview */}
      <div className="aspect-square bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center">
        <FileText className="w-12 h-12 text-white opacity-50" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#ededed] truncate">
            {document.vendor}
          </h3>
          <button className="p-1 hover:bg-[#1e1e24] rounded transition">
            <MoreVertical className="w-4 h-4 text-[#666]" />
          </button>
        </div>

        <p className="text-xs text-[#666] truncate">{document.filename}</p>

        <div className="flex items-center justify-between pt-2 border-t border-[#2a2a35]">
          <div>
            <p className="text-xs text-[#666] mb-1">
              {new Date(document.date).toLocaleDateString('pl-PL')}
            </p>
            <p className="text-lg font-bold text-[#a29bfe]">
              {document.amount.toFixed(2)} zł
            </p>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
