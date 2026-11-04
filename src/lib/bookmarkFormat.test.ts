import { describe, it, expect } from 'vitest'
import { catalogNumber, formatDate } from './bookmarkFormat.ts'

describe('formatDate', () => {
  it('is null without a date', () => {
    expect(formatDate(undefined)).toBeNull()
  })

  it('pads the month and the day', () => {
    expect(formatDate(new Date(2024, 2, 8, 12).getTime())).toBe('2024·03·08')
  })

  it('uses the local day, even late at night', () => {
    expect(formatDate(new Date(2019, 11, 31, 23, 59).getTime())).toBe('2019·12·31')
  })
})

describe('catalogNumber', () => {
  it('counts from 1 and pads to three digits', () => {
    expect(catalogNumber(0)).toBe('№001')
    expect(catalogNumber(41)).toBe('№042')
  })

  it('does not truncate past three digits', () => {
    expect(catalogNumber(1234)).toBe('№1235')
  })
})
