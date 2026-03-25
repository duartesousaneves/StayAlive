import { describe, it, expect } from 'vitest'
import { extractKeyword } from './keywords'

describe('extractKeyword', () => {
  it('returns the first word with more than 3 chars', () => {
    expect(extractKeyword('CONTINENTE MODELO LX 14-03')).toBe('CONTINENTE')
  })

  it('skips short words (3 chars or fewer)', () => {
    expect(extractKeyword('MB AT CONTINENTE')).toBe('CONTINENTE')
  })

  it('skips purely numeric tokens', () => {
    expect(extractKeyword('123456 LIDL SUPERMERCADO')).toBe('LIDL')
  })

  it('skips date-like tokens (DD-MM pattern)', () => {
    expect(extractKeyword('14-03 SUPERMERCADO')).toBe('SUPERMERCADO')
  })

  it('skips date-like tokens (DD/MM pattern)', () => {
    expect(extractKeyword('14/03 PINGO DOCE')).toBe('PINGO')
  })

  it('returns null when no qualifying word exists', () => {
    expect(extractKeyword('MB AT 14-03')).toBeNull()
  })

  it('handles empty string', () => {
    expect(extractKeyword('')).toBeNull()
  })

  it('strips non-alpha chars before length check', () => {
    // "R$€" has 0 alpha chars after stripping → skip
    expect(extractKeyword('R$€ CONTINENTE')).toBe('CONTINENTE')
  })
})
