import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SYSTEM_PROMPT = `Jesteś ekspertem OCR wyspecjalizowanym w rozpoznawaniu polskich paragonów i faktur.
Analizuj przysłane zdjęcie/dokument i wyodrębnij dane w formacie JSON.

Zwróć TYLKO poprawny JSON (bez markdown, bez \`\`\`json):
{
  "vendor_name": "nazwa sprzedawcy/sklepu",
  "vendor_nip": "NIP sprzedawcy jeśli widoczny, lub null",
  "date": "YYYY-MM-DD",
  "total_amount": 123.45,
  "items": [
    { "name": "nazwa produktu", "price": 12.99 }
  ],
  "suggested_category": "sugerowana kategoria wydatku (np. Jedzenie, Transport, Mieszkanie, Higiena, Rozrywka, Zdrowie, Ubrania, Inne)",
  "confidence": 0.95
}

Zasady:
- Kwoty zawsze jako liczby (nie stringi)
- Data w formacie ISO (YYYY-MM-DD)
- Jeśli nie możesz odczytać wartości, ustaw null
- confidence: 0.0-1.0 (pewność odczytu)
- suggested_category: najlepsza kategoria na podstawie nazwy sklepu i produktów
`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user auth from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Nie zalogowano' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Klucz API Anthropic nie jest skonfigurowany' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return new Response(JSON.stringify({ error: 'Brak pliku' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const bytes = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
    const isPDF = file.type === 'application/pdf'

    // Build content block
    let fileContent
    if (isPDF) {
      fileContent = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      }
    } else {
      const mediaType = file.type === 'image/png' ? 'image/png'
        : file.type === 'image/webp' ? 'image/webp'
        : file.type === 'image/gif' ? 'image/gif'
        : 'image/jpeg'
      fileContent = {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      }
    }

    // Call Claude API directly
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            fileContent,
            { type: 'text', text: 'Rozpoznaj dane z tego paragonu/faktury. Zwróć dane w formacie JSON zgodnie z instrukcją.' },
          ],
        }],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      return new Response(JSON.stringify({ error: `Błąd Claude API: ${claudeResponse.status}`, details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const message = await claudeResponse.json()
    const responseText = message.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('')

    let ocrResult
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      ocrResult = JSON.parse(jsonStr)
    } catch {
      return new Response(JSON.stringify({ error: 'Nie udało się przetworzyć odpowiedzi OCR', raw: responseText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${file.name || 'scan.jpg'}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, new Uint8Array(bytes), {
        contentType: file.type,
        upsert: false,
      })

    let filePath = fileName
    if (uploadError) {
      console.warn('Storage upload failed:', uploadError.message)
      filePath = `local/${fileName}`
    }

    // Save document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        ocr_raw: ocrResult,
        ocr_vendor_name: ocrResult.vendor_name || null,
        ocr_total: ocrResult.total_amount || null,
        ocr_date: ocrResult.date || null,
        ocr_nip: ocrResult.vendor_nip || null,
        ocr_category_suggestion: ocrResult.suggested_category || null,
        status: 'processed',
      })
      .select()
      .single()

    if (docError) {
      console.error('Document save error:', docError.message)
    }

    return new Response(JSON.stringify({
      ...ocrResult,
      document_id: document?.id || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nieznany błąd'
    return new Response(JSON.stringify({ error: `Błąd OCR: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
