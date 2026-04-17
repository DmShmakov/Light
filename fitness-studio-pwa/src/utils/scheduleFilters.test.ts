import { describe, it, expect } from 'vitest'
import { applyFilters, hasActiveFilters, EMPTY_FILTERS } from './scheduleFilters'
import { FitnessClass } from '../types'

function makeClass(overrides: Partial<FitnessClass>): FitnessClass {
  return {
    classId: 'c1',
    title: 'Йога',
    type: 'yoga',
    trainerId: 't1',
    trainerName: 'Анна',
    startDateTime: new Date('2026-04-21T09:00:00'),
    endDateTime:   new Date('2026-04-21T10:00:00'),
    maxParticipants: 10,
    description: '',
    level: 'beginner',
    status: 'scheduled',
    createdAt: new Date(),
    ...overrides,
  }
}

const classes: FitnessClass[] = [
  makeClass({ classId: '1', title: 'Йога',     type: 'yoga',     level: 'beginner',     trainerName: 'Анна',   startDateTime: new Date('2026-04-21T09:00:00') }),
  makeClass({ classId: '2', title: 'Пилатес',  type: 'pilates',  level: 'intermediate', trainerName: 'Борис',  startDateTime: new Date('2026-04-21T13:00:00') }),
  makeClass({ classId: '3', title: 'Кроссфит', type: 'crossfit', level: 'advanced',     trainerName: 'Анна',   startDateTime: new Date('2026-04-21T19:00:00') }),
  makeClass({ classId: '4', title: 'Стретчинг',type: 'stretch',  level: 'beginner',     trainerName: 'Виктор', startDateTime: new Date('2026-04-21T07:00:00') }),
]

describe('applyFilters', () => {
  it('без фильтров возвращает все занятия', () => {
    expect(applyFilters(classes, EMPTY_FILTERS)).toHaveLength(4)
  })

  describe('поиск', () => {
    it('фильтрует по названию (без учёта регистра)', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, search: 'йога' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('1')
    })

    it('фильтрует по имени тренера', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, search: 'анна' })
      expect(result).toHaveLength(2)
      expect(result.map(c => c.classId)).toEqual(['1', '3'])
    })

    it('возвращает пусто если нет совпадений', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, search: 'зумба' })
      expect(result).toHaveLength(0)
    })
  })

  describe('тип занятия', () => {
    it('фильтрует по типу yoga', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, type: 'yoga' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('1')
    })

    it('пустой тип = все занятия', () => {
      expect(applyFilters(classes, { ...EMPTY_FILTERS, type: '' })).toHaveLength(4)
    })
  })

  describe('уровень сложности', () => {
    it('фильтрует beginner', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, level: 'beginner' })
      expect(result).toHaveLength(2)
      expect(result.map(c => c.classId)).toEqual(['1', '4'])
    })

    it('фильтрует advanced', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, level: 'advanced' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('3')
    })
  })

  describe('время суток', () => {
    it('утро (6–12): 07:00 и 09:00', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, timeOfDay: 'morning' })
      expect(result.map(c => c.classId)).toEqual(['1', '4'])
    })

    it('день (12–17): 13:00', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, timeOfDay: 'afternoon' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('2')
    })

    it('вечер (17–23): 19:00', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, timeOfDay: 'evening' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('3')
    })
  })

  describe('комбинирование фильтров', () => {
    it('тип + уровень', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, type: 'yoga', level: 'beginner' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('1')
    })

    it('поиск + время суток', () => {
      const result = applyFilters(classes, { ...EMPTY_FILTERS, search: 'анна', timeOfDay: 'morning' })
      expect(result).toHaveLength(1)
      expect(result[0].classId).toBe('1')
    })

    it('все фильтры активны — нет совпадений', () => {
      const result = applyFilters(classes, { search: 'Анна', type: 'pilates', level: 'beginner', timeOfDay: 'morning' })
      expect(result).toHaveLength(0)
    })
  })
})

describe('hasActiveFilters', () => {
  it('false для пустых фильтров', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('true если заполнен search', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: 'йога' })).toBe(true)
  })

  it('true если выбран тип', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, type: 'yoga' })).toBe(true)
  })

  it('true если выбран уровень', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, level: 'beginner' })).toBe(true)
  })

  it('true если выбрано время', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, timeOfDay: 'morning' })).toBe(true)
  })
})
