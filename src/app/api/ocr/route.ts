import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Jeste\u015b ekspertem OCR wyspecjalizowanym w rozpoznawaniu polskich paragon\u00f3w i faktur.
Analizuj przys\u0142ane zdj\u0119cie i wyodr\u0119bnij dane w formacie JSON.

Zwr\u00f3\u0107 TYLKO poprawny JSON (bez markdown, bez \`\`\`json):
{
  "vendor_name": "nazwa sprzedawcy/sklepu",
  "vendor_nip": "NIP sprzedawcy je\u015bli widoczny, lub null",
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
- Je\u015bli nie mo\u017cesz odczyta\u0107 warto\u015bci, ustaw null
- confidence: 0.0-1.0 (pewno\u015b\u0107 odczytu)
- suggested_category: najlepsza kategoria na podstawie nazwy sklepu i produkt\u00f3w
`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
    }

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'placeholder') {
      return NextResponse.json(
        { error: 'Klucz API Anthropic nie jest skonfigurowany. Ustaw ANTHROPIC_API_KEY w zmiennych \u015brodowiskowych.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    // Convert to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Determine media type
    let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
    if (file.type === 'image/png') mediaType = 'image/png'
    else if (file.type === 'image/webp') mediaType = 'image/webp'
    else if (file.type === 'image/gif') mediaType = 'image/gif'

    // Call Claude Vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Rozpoznaj dane z tego paragonu/faktury. Zwr\u00f3\u0107 dane w formacie JSON zgodnie z instrukcj\u0105.',
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    })

    // Parse response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')

    let ocrResult
    try {
      // Try to parse JSON, handling possible markdown wrapping
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      ocrResult = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Nie uda\u0142o si\u0119 przetworzy\u0107 odpowiedzi OCR', raw: responseText },
        { status: 500 }
      )
    }

    // Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}_${file.name || 'scan.jpg'}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, Buffer.from(bytes), {
        contentType: file.type,
        upsert: false,
      })

    let filePath = fileName
    if (uploadError) {
      // If storage bucket doesn't exist or upload fails, just store the path reference
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

    return NextResponse.json({
      ...ocrResult,
      document_id: document?.id || null,
    })
  } catch (error) {
    console.error('OCR Error:', error)
    const message = error instanceof Error ? error.message : 'Nieznany b\u0142\u0105d'
    return NextResponse.json(
      { error: `B\u0142\u0105d OCR: ${message}` },
      { status: 500 }
    )
  }
}
