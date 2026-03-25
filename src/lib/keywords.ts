/**
 * Extracts the first keyword from a transaction description.
 * A keyword is the first token that:
 *   - Has more than 3 alphabetic characters
 *   - Is not purely numeric
 *   - Does not look like a date (DD-MM or DD/MM)
 */
export function extractKeyword(description: string): string | null {
  const tokens = description.trim().split(/[\s]+/)
  for (const token of tokens) {
    if (/^\d{2}[-/]\d{2}/.test(token)) continue        // date-like: 14-03, 14/03
    if (/^\d+$/.test(token)) continue                  // purely numeric
    const alpha = token.replace(/[^a-zA-ZÀ-ÿ]/g, '')
    if (alpha.length <= 3) continue                    // too short after stripping
    return alpha
  }
  return null
}
