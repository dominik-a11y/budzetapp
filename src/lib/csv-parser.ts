export interface ParsedTransaction {
  date: string       // YYYY-MM-DD
  description: string
  amount: number     // positive = income, negative = expense
  balance?: number
  originalRow: string[]
}

export interface ParseResult {
  bank: string
  transactions: ParsedTransaction[]
  errors: string[]
}

type BankParser = {
  name: string
  detect: (lines: string[][], headerLine: string) => boolean
  parse: (lines: string[][]) => ParsedTransaction[]
}

// Helper: parse Polish date formats to YYYY-MM-DD
function parseDate(raw: string): string {
  const trimmed = raw.trim().replace(/"/g, '')

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY
  const match = trimmed.match(/^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`

  // YYYYMMDD
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`

  return trimmed
}

// Helper: parse Polish number format (1 234,56 or -1234.56)
function parseAmount(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/"/g, '')
    .replace(/\s/g, '')       // remove spaces (thousand separators)
    .replace(/,/g, '.')       // Polish decimal comma → dot

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// Split CSV line respecting quoted fields
function splitCSVLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Detect separator: semicolon vs comma vs tab
function detectSeparator(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n')
  const semicolons = (firstLines.match(/;/g) || []).length
  const commas = (firstLines.match(/,/g) || []).length
  const tabs = (firstLines.match(/\t/g) || []).length

  if (tabs > semicolons && tabs > commas) return '\t'
  if (semicolons > commas) return ';'
  return ','
}

// ===== Bank parsers =====

const mBankParser: BankParser = {
  name: 'mBank',
  detect: (lines, header) => {
    const h = header.toLowerCase()
    return h.includes('mbank') ||
      h.includes('#data operacji') ||
      (h.includes('data operacji') && h.includes('opis operacji') && h.includes('rachunek'))
  },
  parse: (lines) => {
    // mBank: #Data operacji;#Opis operacji;#Rachunek;#Kategoria;#Kwota;#Saldo po operacji
    const dataStart = lines.findIndex(row =>
      row.some(cell => cell.toLowerCase().includes('data operacji'))
    )
    if (dataStart === -1) return []

    return lines.slice(dataStart + 1)
      .filter(row => row.length >= 5 && row[0].trim())
      .map(row => ({
        date: parseDate(row[0]),
        description: row[1]?.trim() || '',
        amount: parseAmount(row[4]),
        balance: row[5] ? parseAmount(row[5]) : undefined,
        originalRow: row,
      }))
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

const pkoBPParser: BankParser = {
  name: 'PKO BP',
  detect: (_lines, header) => {
    const h = header.toLowerCase()
    return h.includes('data operacji') && h.includes('kwota') &&
      (h.includes('data waluty') || h.includes('saldo po'))
  },
  parse: (lines) => {
    const dataStart = lines.findIndex(row =>
      row.some(cell => cell.toLowerCase().includes('data operacji'))
    )
    if (dataStart === -1) return []

    const headerRow = lines[dataStart].map(c => c.toLowerCase().trim())
    const dateIdx = headerRow.findIndex(c => c.includes('data operacji'))
    const descIdx = headerRow.findIndex(c => c.includes('opis') || c.includes('tytuł'))
    const amountIdx = headerRow.findIndex(c => c === 'kwota' || c.includes('kwota'))
    const balanceIdx = headerRow.findIndex(c => c.includes('saldo'))

    return lines.slice(dataStart + 1)
      .filter(row => row.length > amountIdx && row[dateIdx]?.trim())
      .map(row => ({
        date: parseDate(row[dateIdx]),
        description: descIdx >= 0 ? row[descIdx]?.trim() || '' : '',
        amount: parseAmount(row[amountIdx]),
        balance: balanceIdx >= 0 ? parseAmount(row[balanceIdx]) : undefined,
        originalRow: row,
      }))
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

const ingParser: BankParser = {
  name: 'ING',
  detect: (_lines, header) => {
    const h = header.toLowerCase()
    return (h.includes('ing') || h.includes('data transakcji')) &&
      h.includes('kwota')
  },
  parse: (lines) => {
    const dataStart = lines.findIndex(row =>
      row.some(cell => cell.toLowerCase().includes('data transakcji') || cell.toLowerCase().includes('data'))
    )
    if (dataStart === -1) return []

    const headerRow = lines[dataStart].map(c => c.toLowerCase().trim())
    const dateIdx = headerRow.findIndex(c => c.includes('data transakcji') || c === 'data')
    const descIdx = headerRow.findIndex(c => c.includes('opis') || c.includes('tytuł') || c.includes('dane kontrahenta'))
    const amountIdx = headerRow.findIndex(c => c.includes('kwota'))
    const balanceIdx = headerRow.findIndex(c => c.includes('saldo'))

    return lines.slice(dataStart + 1)
      .filter(row => row.length > Math.max(dateIdx, amountIdx) && row[dateIdx]?.trim())
      .map(row => ({
        date: parseDate(row[dateIdx]),
        description: descIdx >= 0 ? row[descIdx]?.trim() || '' : '',
        amount: parseAmount(row[amountIdx]),
        balance: balanceIdx >= 0 ? parseAmount(row[balanceIdx]) : undefined,
        originalRow: row,
      }))
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

const santanderParser: BankParser = {
  name: 'Santander',
  detect: (_lines, header) => {
    const h = header.toLowerCase()
    return h.includes('santander') ||
      (h.includes('data') && h.includes('obciążenia') && h.includes('uznania'))
  },
  parse: (lines) => {
    const dataStart = lines.findIndex(row =>
      row.some(cell => cell.toLowerCase().includes('data'))
    )
    if (dataStart === -1) return []

    const headerRow = lines[dataStart].map(c => c.toLowerCase().trim())
    const dateIdx = headerRow.findIndex(c => c.includes('data'))
    const descIdx = headerRow.findIndex(c => c.includes('opis'))
    const debitIdx = headerRow.findIndex(c => c.includes('obciążenia') || c.includes('obciazenia'))
    const creditIdx = headerRow.findIndex(c => c.includes('uznania'))
    const amountIdx = headerRow.findIndex(c => c === 'kwota')
    const balanceIdx = headerRow.findIndex(c => c.includes('saldo'))

    return lines.slice(dataStart + 1)
      .filter(row => row.length > dateIdx && row[dateIdx]?.trim())
      .map(row => {
        let amount = 0
        if (amountIdx >= 0) {
          amount = parseAmount(row[amountIdx])
        } else if (debitIdx >= 0 && creditIdx >= 0) {
          const debit = row[debitIdx]?.trim() ? parseAmount(row[debitIdx]) : 0
          const credit = row[creditIdx]?.trim() ? parseAmount(row[creditIdx]) : 0
          amount = credit > 0 ? credit : -Math.abs(debit)
        }

        return {
          date: parseDate(row[dateIdx]),
          description: descIdx >= 0 ? row[descIdx]?.trim() || '' : '',
          amount,
          balance: balanceIdx >= 0 ? parseAmount(row[balanceIdx]) : undefined,
          originalRow: row,
        }
      })
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

const millenniumParser: BankParser = {
  name: 'Millennium',
  detect: (_lines, header) => {
    const h = header.toLowerCase()
    return h.includes('millennium') ||
      (h.includes('data') && h.includes('rodzaj') && h.includes('kwota'))
  },
  parse: (lines) => {
    const dataStart = lines.findIndex(row =>
      row.some(cell => cell.toLowerCase().includes('data'))
    )
    if (dataStart === -1) return []

    const headerRow = lines[dataStart].map(c => c.toLowerCase().trim())
    const dateIdx = headerRow.findIndex(c => c.includes('data'))
    const descIdx = headerRow.findIndex(c => c.includes('opis') || c.includes('tytuł'))
    const amountIdx = headerRow.findIndex(c => c.includes('kwota'))
    const balanceIdx = headerRow.findIndex(c => c.includes('saldo'))

    return lines.slice(dataStart + 1)
      .filter(row => row.length > Math.max(dateIdx, amountIdx) && row[dateIdx]?.trim())
      .map(row => ({
        date: parseDate(row[dateIdx]),
        description: descIdx >= 0 ? row[descIdx]?.trim() || '' : '',
        amount: parseAmount(row[amountIdx]),
        balance: balanceIdx >= 0 ? parseAmount(row[balanceIdx]) : undefined,
        originalRow: row,
      }))
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

// Generic fallback: tries to find date-like and number-like columns
const genericParser: BankParser = {
  name: 'Ogólny CSV',
  detect: () => true,
  parse: (lines) => {
    if (lines.length < 2) return []

    // Find header row (first row with at least 3 cells)
    const headerIdx = lines.findIndex(row => row.length >= 3)
    if (headerIdx === -1) return []

    const headerRow = lines[headerIdx].map(c => c.toLowerCase().trim())

    // Try to find columns by name
    let dateIdx = headerRow.findIndex(c => c.includes('data') || c === 'date')
    let descIdx = headerRow.findIndex(c => c.includes('opis') || c.includes('tytuł') || c.includes('description') || c.includes('title'))
    let amountIdx = headerRow.findIndex(c => c.includes('kwota') || c.includes('amount') || c.includes('wartość'))

    // If no named columns found, try by position and content detection
    if (dateIdx === -1 || amountIdx === -1) {
      const sampleRow = lines[headerIdx + 1]
      if (!sampleRow) return []

      for (let i = 0; i < sampleRow.length; i++) {
        const val = sampleRow[i].trim()
        if (dateIdx === -1 && /\d{2,4}[.\-/]\d{2}[.\-/]\d{2,4}/.test(val)) {
          dateIdx = i
        } else if (amountIdx === -1 && /^-?\d[\d\s]*[,.]?\d*$/.test(val.replace(/"/g, ''))) {
          amountIdx = i
        } else if (descIdx === -1 && val.length > 5 && !/^\d/.test(val)) {
          descIdx = i
        }
      }
    }

    if (dateIdx === -1 || amountIdx === -1) return []

    return lines.slice(headerIdx + 1)
      .filter(row => row.length > Math.max(dateIdx, amountIdx) && row[dateIdx]?.trim())
      .map(row => ({
        date: parseDate(row[dateIdx]),
        description: descIdx >= 0 ? row[descIdx]?.trim() || '' : '',
        amount: parseAmount(row[amountIdx]),
        originalRow: row,
      }))
      .filter(tx => tx.date && tx.amount !== 0)
  },
}

const PARSERS: BankParser[] = [
  mBankParser,
  pkoBPParser,
  ingParser,
  santanderParser,
  millenniumParser,
  genericParser,
]

export function parseCSV(text: string): ParseResult {
  const errors: string[] = []

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const separator = detectSeparator(normalized)

  const rawLines = normalized.split('\n').filter(line => line.trim())
  const lines = rawLines.map(line => splitCSVLine(line, separator))
  const headerLine = rawLines.slice(0, 5).join(' ').toLowerCase()

  // Try each parser
  for (const parser of PARSERS) {
    if (parser.detect(lines, headerLine)) {
      try {
        const transactions = parser.parse(lines)
        if (transactions.length > 0) {
          return { bank: parser.name, transactions, errors }
        }
      } catch (e) {
        errors.push(`Parser ${parser.name}: ${e instanceof Error ? e.message : 'nieznany błąd'}`)
      }
    }
  }

  errors.push('Nie udało się rozpoznać formatu CSV. Upewnij się, że plik zawiera kolumny z datą i kwotą.')
  return { bank: 'Nierozpoznany', transactions: [], errors }
}
