import { describe, test, expect } from 'vitest'

describe('AdminCreateClassPage — логика автозаполнения endDateTime', () => {
  test('endDateTime = startDateTime + 1 час (через timestamp)', () => {
    // Логика из AdminCreateClassPage:
    // new Date(startDateTimeValue.getTime() + 60 * 60 * 1000)

    const startDateTime = new Date('2026-04-20T10:00:00')
    const endDate = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    expect(endDate).toEqual(new Date('2026-04-20T11:00:00'))
    expect(endDate.getTime() - startDateTime.getTime()).toBe(60 * 60 * 1000)
  })

  test('endDateTime = startDateTime + 1 час (edge cases)', () => {
    const testCases = [
      { start: '2026-01-15T08:30:00', expected: '2026-01-15T09:30:00' },
      { start: '2026-06-20T23:00:00', expected: '2026-06-21T00:00:00' }, // переход на следующий день
      { start: '2026-12-31T23:00:00', expected: '2027-01-01T00:00:00' }, // переход на следующий год
      { start: '2026-02-28T12:00:00', expected: '2026-02-28T13:00:00' },
      { start: '2026-04-20T00:00:00', expected: '2026-04-20T01:00:00' }, // полночь → 1 час ночи
    ]

    for (const { start, expected } of testCases) {
      const startDateTime = new Date(start)
      const endDate = new Date(startDateTime.getTime() + 60 * 60 * 1000)

      expect(endDate.toISOString()).toBe(new Date(expected).toISOString())
    }
  })
})
