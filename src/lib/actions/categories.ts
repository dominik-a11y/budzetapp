import { createClient } from '@/lib/supabase/client'
import { DEFAULT_CATEGORIES } from '@/lib/categories'
import type { Category, CategoryWithChildren } from '@/types/budget'

export async function getCategories(): Promise<CategoryWithChildren[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(error.message)

  const categories = (data || []) as Category[]
  const parents = categories.filter(c => !c.parent_id)
  const children = categories.filter(c => c.parent_id)

  return parents.map(parent => ({
    ...parent,
    children: children.filter(c => c.parent_id === parent.id),
  }))
}

export async function getFlatCategories(): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw new Error(error.message)
  return (data || []) as Category[]
}

export async function initializeDefaultCategories(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  // Check if user already has categories
  const { count } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) return // Already initialized

  // Insert parent categories first
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const template = DEFAULT_CATEGORIES[i]

    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: template.name,
        type: template.type,
        parent_id: null,
        sort_order: i,
      })
      .select('id')
      .single()

    if (parentError) throw new Error(parentError.message)

    // Insert children
    if (template.children.length > 0) {
      const childRows = template.children.map((name, j) => ({
        user_id: user.id,
        name,
        type: template.type,
        parent_id: parent.id,
        sort_order: j,
      }))

      const { error: childError } = await supabase
        .from('categories')
        .insert(childRows)

      if (childError) throw new Error(childError.message)
    }
  }
}

export async function createCategory(data: {
  name: string
  type: Category['type']
  parent_id: string | null
}): Promise<Category> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  // Get max sort_order for siblings
  let query = supabase
    .from('categories')
    .select('sort_order')
    .eq('is_active', true)

  if (data.parent_id) {
    query = query.eq('parent_id', data.parent_id)
  } else {
    query = query.is('parent_id', null)
  }

  const { data: siblings } = await query.order('sort_order', { ascending: false }).limit(1)
  const nextOrder = siblings && siblings.length > 0 ? siblings[0].sort_order + 1 : 0

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: data.name,
      type: data.type,
      parent_id: data.parent_id,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return category as Category
}

export async function updateCategory(
  id: string,
  data: { name?: string; sort_order?: number; icon?: string | null }
): Promise<Category> {
  const supabase = createClient()

  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return category as Category
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient()

  // Soft delete — mark as inactive
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Also deactivate children if it's a parent
  await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('parent_id', id)
}
