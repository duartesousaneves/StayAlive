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

function parsePortugueseDate(val: string): string {
  // Handles DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
  const ddmmyyyy = val.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  return val // assume ISO
}

function parseAmount(val: string, negativeIsExpense: boolean): number {
  // Handle European number format: 1.234,56 → 1234.56
  const normalized = val.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return negativeIsExpense ? n : Math.abs(n) * (n < 0 ? -1 : 1)
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows
    .map(row => {
      const rawAmount = row[mapping.amountCol] ?? ''
      const amount = parseAmount(rawAmount, mapping.negativeIsExpense)
      return {
        date: parsePortugueseDate(row[mapping.dateCol] ?? ''),
        description: (row[mapping.descriptionCol] ?? '').trim(),
        amount,
        raw: row,
      }
    })
    .filter(r => r.description && !isNaN(r.amount))
}
