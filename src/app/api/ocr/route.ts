import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Brak pliku' },
        { status: 400 }
      )
    }

    // TODO: Integrate with Claude API for OCR processing
    // For now, return mock data

    const mockOCRResult = {
      vendor_name: 'Tesco Polska',
      vendor_nip: '7010013044',
      date: new Date().toISOString().split('T')[0],
      total_amount: 156.50,
      suggested_category: 'Jedzenie',
      items: [
        { name: 'Mleko 3.2%', price: 4.99 },
        { name: 'Chleb razowiec', price: 3.99 },
        { name: 'Owoce świeże', price: 25.50 },
        { name: 'Warzywa sezonowe', price: 45.00 },
        { name: 'Mięso drobiowe kg', price: 28.50 },
        { name: 'Ser żółty', price: 19.99 },
        { name: 'Jogurt naturalny', price: 7.99 },
        { name: 'Inne artykuly spożywcze', price: 16.54 },
      ],
      confidence: 0.92,
    }

    return NextResponse.json(mockOCRResult)
  } catch (error) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { error: 'Błąd podczas przetwarzania obrazu' },
      { status: 500 }
    )
  }
}
