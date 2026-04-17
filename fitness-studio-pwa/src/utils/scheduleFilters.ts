import { FitnessClass } from '../types'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

export interface ScheduleFilterState {
  search: string
  type: string      // '' = все
  level: string     // '' = все
  timeOfDay: string // '' = все
}

export const EMPTY_FILTERS: ScheduleFilterState = {
  search: '',
  type: '',
  level: '',
  timeOfDay: '',
}

function getHour(date: Date): number {
  return new Date(date).getHours()
}

function matchesTimeOfDay(cls: FitnessClass, timeOfDay: string): boolean {
  if (!timeOfDay) return true
  const hour = getHour(cls.startDateTime)
  if (timeOfDay === 'morning')   return hour >= 6  && hour < 12
  if (timeOfDay === 'afternoon') return hour >= 12 && hour < 17
  if (timeOfDay === 'evening')   return hour >= 17 && hour < 23
  return true
}

function matchesSearch(cls: FitnessClass, search: string): boolean {
  if (!search) return true
  const q = search.toLowerCase()
  return (
    cls.title.toLowerCase().includes(q) ||
    cls.trainerName.toLowerCase().includes(q)
  )
}

export function applyFilters(
  classes: FitnessClass[],
  filters: ScheduleFilterState
): FitnessClass[] {
  return classes.filter(
    (cls) =>
      matchesSearch(cls, filters.search) &&
      (!filters.type      || cls.type  === filters.type) &&
      (!filters.level     || cls.level === filters.level) &&
      matchesTimeOfDay(cls, filters.timeOfDay)
  )
}

export function hasActiveFilters(filters: ScheduleFilterState): boolean {
  return (
    filters.search !== '' ||
    filters.type   !== '' ||
    filters.level  !== '' ||
    filters.timeOfDay !== ''
  )
}
