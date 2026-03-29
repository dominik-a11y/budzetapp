import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Call the OCR edge function with auth token.
 * Falls back to /api/ocr for web deployment (Vercel).
 */
export async function callOCR(file: File): Promise<{
  vendor_name: string
  vendor_nip?: string | null
  date: string
  total_amount: number
  suggested_category: string
  items: Array<{ name: string; price: number }>
  confidence: number
  document_id?: string | null
}> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const formData = new FormData()
  formData.append('file', file)

  // Try edge function first, fall back to API route
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/ocr`
  const apiRouteUrl = '/api/ocr'

  const headers: Record<string, string> = {}
  let url: string

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
    url = edgeFunctionUrl
  } else {
    url = apiRouteUrl
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Błąd OCR')
  }

  return data
}
