import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year') || '2026'
    const month = searchParams.get('month')

    // TODO: Integrate with ExcelJS to generate actual Excel file
    // For now, return a placeholder response

    const fileName = month
      ? `BudzetApp_${year}_${month}.xlsx`
      : `BudzetApp_${year}.xlsx`

    // Return a placeholder binary response
    const placeholderContent = Buffer.from(
      'PK\x03\x04\x14\x00\x00\x00\x08\x00' // Minimal ZIP header
    )

    return new NextResponse(placeholderContent, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Export Error:', error)
    return NextResponse.json(
      { error: 'Błąd podczas eksportu' },
      { status: 500 }
    )
  }
}
