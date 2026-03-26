'use client'

import { useState } from 'react'
import { ChevronDown, Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import { DEFAULT_CATEGORIES } from '@/lib/categories'

export default function CategoriesPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const categories = DEFAULT_CATEGORIES

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Kategorie</h1>
          <p className="text-[#999] mt-1">
            Zarządzaj kategoriami wydatków i dochodów
          </p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:from-[#5a4bc4] hover:to-[#9189d8] text-white font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-5 h-5" />
          <span>Dodaj kategorię</span>
        </button>
      </div>

      {/* Categories by Type */}
      <div className="space-y-4">
        {categories.map((category) => (
          <CategoryGroup
            key={category.name}
            category={category}
            isExpanded={expanded === category.name}
            onToggle={() =>
              setExpanded(
                expanded === category.name ? null : category.name
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

function CategoryGroup({
  category,
  isExpanded,
  onToggle,
}: {
  category: { name: string; type: string; children: string[] }
  isExpanded: boolean
  onToggle: () => void
}) {
  const typeColors: { [key: string]: string } = {
    income: 'text-[#00b894]',
    expense: 'text-[#e17055]',
    savings: 'text-[#74b9ff]',
  }

  const typeLabels: { [key: string]: string } = {
    income: 'Przychody',
    expense: 'Wydatki',
    savings: 'Oszczędności',
  }

  const typeBadgeColors: { [key: string]: string } = {
    income: 'bg-[#00b894]/20 text-[#00b894]',
    expense: 'bg-[#e17055]/20 text-[#e17055]',
    savings: 'bg-[#74b9ff]/20 text-[#74b9ff]',
  }

  return (
    <div className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1e1e24] transition"
      >
        <div className="flex items-center space-x-4 flex-1">
          <GripVertical className="w-5 h-5 text-[#666] cursor-grab" />
          <div className="text-left">
            <h3 className="font-semibold text-[#ededed]">{category.name}</h3>
            <p className="text-xs text-[#666] mt-1">
              {category.children.length} podkategorii
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${typeBadgeColors[category.type]}`}
          >
            {typeLabels[category.type]}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-[#666] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Subcategories */}
      {isExpanded && (
        <div className="border-t border-[#2a2a35] bg-[#1e1e24] p-4">
          <div className="space-y-2">
            {category.children.map((child, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#141418] rounded-lg hover:bg-[#1e1e24] transition group"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <GripVertical className="w-4 h-4 text-[#666] cursor-grab opacity-0 group-hover:opacity-100" />
                  <span className="text-sm text-[#ededed]">{child}</span>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                  <button className="p-2 hover:bg-[#2a2a35] rounded-lg transition">
                    <Edit2 className="w-4 h-4 text-[#666]" />
                  </button>
                  <button className="p-2 hover:bg-[#2a2a35] rounded-lg transition">
                    <Trash2 className="w-4 h-4 text-[#e17055]" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Subcategory */}
          <button className="w-full mt-3 p-3 border border-dashed border-[#2a2a35] rounded-lg text-[#666] hover:text-[#6c5ce7] hover:border-[#6c5ce7] transition text-sm font-medium flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Dodaj podkategorię</span>
          </button>
        </div>
      )}
    </div>
  )
}
