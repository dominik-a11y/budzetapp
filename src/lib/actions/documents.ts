import { createClient } from '@/lib/supabase/client'
import type { Document } from '@/types/budget'

export async function getDocuments(): Promise<Document[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Document[]
}

export async function getDocument(id: string): Promise<Document | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Document | null
}

export async function createDocument(input: {
  file_path: string
  file_type: string
  file_size?: number
  thumbnail_path?: string
}): Promise<Document> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nie zalogowano')

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      file_path: input.file_path,
      file_type: input.file_type,
      file_size: input.file_size || null,
      thumbnail_path: input.thumbnail_path || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Document
}

export async function updateDocumentOCR(
  id: string,
  ocrData: {
    ocr_raw?: Record<string, unknown>
    ocr_vendor_name?: string
    ocr_total?: number
    ocr_date?: string
    ocr_nip?: string
    ocr_category_suggestion?: string
    status?: 'processed' | 'error'
  }
): Promise<Document> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documents')
    .update(ocrData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Document
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
