import Papa from 'papaparse'

export interface ColumnMapping {
  dateCol: string
  descriptionCol: string
  amountCol: string
  negativeIsExpense: boolean
}

export interface ParsedRow {
  date: string        // YYYY-MM-DD
  description: string
  amount: number      // negative = expense
  raw: Record<string, string>
}

export function parseCSV(file: File): Promise<{ headers: string[], rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data as Record<string, string>[],
        })
      },
      error: reject,
    })
  })
}

function parsePortugueseDate(val: string): string | null {
  // Handles DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
  const ddmmyyyy = val.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  // Validate ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  return null
}

function parseAmount(val: string, negativeIsExpense: boolean): number {
  // Handle European number format: 1.234,56 → 1234.56
  const normalized = val.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return negativeIsExpense ? n : -n
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows
    .map(row => {
      const rawAmount = row[mapping.amountCol] ?? ''
      const amount = parseAmount(rawAmount, mapping.negativeIsExpense)
      const date = parsePortugueseDate(row[mapping.dateCol] ?? '')
      return { date, description: (row[mapping.descriptionCol] ?? '').trim(), amount, raw: row }
    })
    .filter((r): r is { date: string; description: string; amount: number; raw: Record<string, string> } =>
      r.date !== null && r.description !== '' && !isNaN(r.amount)
    )
}
