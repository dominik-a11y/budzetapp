'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Plus, Edit2, Trash2, GripVertical, Loader2, X, Check } from 'lucide-react'
import {
  getCategories,
  initializeDefaultCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/categories'
import type { CategoryWithChildren, CategoryType } from '@/types/budget'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add subcategory state
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const loadCategories = useCallback(async () => {
    try {
      setError(null)
      let data = await getCategories()

      // If no categories exist, initialize defaults
      if (data.length === 0) {
        await initializeDefaultCategories()
        data = await getCategories()
      }

      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania kategorii')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleAddSubcategory = async (parentId: string, parentType: CategoryType) => {
    if (!newSubName.trim()) return
    setSaving(true)
    try {
      await createCategory({
        name: newSubName.trim(),
        type: parentType,
        parent_id: parentId,
      })
      setNewSubName('')
      setAddingTo(null)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd dodawania')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await updateCategory(id, { name: editName.trim() })
      setEditingId(null)
      setEditName('')
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd edycji')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    try {
      await deleteCategory(id)
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6c5ce7] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ededed]">Kategorie</h1>
          <p className="text-[#999] mt-1">
            Zarządzaj kategoriami wydatków i dochodów
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg text-[#ff7675] text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-[#141418] rounded-lg border border-[#2a2a35] overflow-hidden"
          >
            {/* Parent header */}
            <button
              onClick={() =>
                setExpanded(expanded === category.id ? null : category.id)
              }
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#1e1e24] transition"
            >
              <div className="flex items-center space-x-4 flex-1">
                <GripVertical className="w-5 h-5 text-[#666] cursor-grab" />
                <div className="text-left">
                  <h3 className="font-semibold text-[#ededed]">
                    {category.name}
                  </h3>
                  <p className="text-xs text-[#666] mt-1">
                    {category.children.length} podkategorii
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <TypeBadge type={category.type} />
                <ChevronDown
                  className={`w-5 h-5 text-[#666] transition-transform ${
                    expanded === category.id ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Children */}
            {expanded === category.id && (
              <div className="border-t border-[#2a2a35] bg-[#1e1e24] p-4">
                <div className="space-y-2">
                  {category.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 bg-[#141418] rounded-lg hover:bg-[#1e1e24] transition group"
                    >
                      {editingId === child.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(child.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 px-3 py-1.5 bg-[#1e1e24] border border-[#6c5ce7] rounded text-sm text-[#ededed] focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditSave(child.id)}
                            disabled={saving}
                            className="p-1.5 hover:bg-[#2a2a35] rounded transition"
                          >
                            <Check className="w-4 h-4 text-[#00b894]" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 hover:bg-[#2a2a35] rounded transition"
                          >
                            <X className="w-4 h-4 text-[#666]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-3 flex-1">
                            <GripVertical className="w-4 h-4 text-[#666] cursor-grab opacity-0 group-hover:opacity-100" />
                            <span className="text-sm text-[#ededed]">
                              {child.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => {
                                setEditingId(child.id)
                                setEditName(child.name)
                              }}
                              className="p-2 hover:bg-[#2a2a35] rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4 text-[#666]" />
                            </button>
                            <button
                              onClick={() => handleDelete(child.id)}
                              className="p-2 hover:bg-[#2a2a35] rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4 text-[#e17055]" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add subcategory */}
                {addingTo === category.id ? (
                  <div className="mt-3 flex items-center space-x-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          handleAddSubcategory(category.id, category.type)
                        if (e.key === 'Escape') {
                          setAddingTo(null)
                          setNewSubName('')
                        }
                      }}
                      placeholder="Nazwa podkategorii..."
                      className="flex-1 px-3 py-2 bg-[#141418] border border-[#6c5ce7] rounded-lg text-sm text-[#ededed] placeholder-[#666] focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() =>
                        handleAddSubcategory(category.id, category.type)
                      }
                      disabled={saving || !newSubName.trim()}
                      className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Dodaj'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setAddingTo(null)
                        setNewSubName('')
                      }}
                      className="p-2 hover:bg-[#2a2a35] rounded-lg transition"
                    >
                      <X className="w-4 h-4 text-[#666]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingTo(category.id)
                      setNewSubName('')
                    }}
                    className="w-full mt-3 p-3 border border-dashed border-[#2a2a35] rounded-lg text-[#666] hover:text-[#6c5ce7] hover:border-[#6c5ce7] transition text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dodaj podkategorię</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    income: { bg: 'bg-[#00b894]/20 text-[#00b894]', label: 'Przychody' },
    expense: { bg: 'bg-[#e17055]/20 text-[#e17055]', label: 'Wydatki' },
    savings: { bg: 'bg-[#74b9ff]/20 text-[#74b9ff]', label: 'Oszczędności' },
  }

  const c = config[type] || config.expense

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.bg}`}>
      {c.label}
    </span>
  )
}
