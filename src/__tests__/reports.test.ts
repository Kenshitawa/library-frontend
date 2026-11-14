import { describe, expect, it } from 'vitest'
import { toCsv } from '../lib/reports'

describe('report CSV export', () => {
  it('quotes values containing commas, quotes, and line breaks', () => {
    expect(toCsv(['Title'], [['A "Good", Book\nPart 2']])).toBe(
      '"Title"\r\n"A ""Good"", Book\nPart 2"'
    )
  })

  it('neutralizes spreadsheet formulas in exported text', () => {
    expect(toCsv(['Borrower'], [['=HYPERLINK("https://example.test")']])).toBe(
      '"Borrower"\r\n"\'=HYPERLINK(""https://example.test"")"'
    )
  })
})
