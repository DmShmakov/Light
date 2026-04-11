import { create } from 'zustand'
import { FitnessClass, Enrollment, ClassWithEnrollment } from '../types'

interface ScheduleState {
  classes: FitnessClass[]
  enrollments: Enrollment[]
  loading: boolean
  error: string | null
  selectedWeekStart: Date

  // Actions
  setClasses: (classes: FitnessClass[]) => void
  setEnrollments: (enrollments: Enrollment[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedWeekStart: (date: Date) => void
  
  // Computed helpers
  getClassesWithEnrollment: (userId: string) => ClassWithEnrollment[]
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  classes: [],
  enrollments: [],
  loading: false,
  error: null,
  selectedWeekStart: new Date(),

  setClasses: (classes) => set({ classes }),
  setEnrollments: (enrollments) => set({ enrollments }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedWeekStart: (date) => set({ selectedWeekStart: date }),

  getClassesWithEnrollment: (userId: string) => {
    const { classes, enrollments } = get()
    
    return classes.map((cls) => {
      const enrollment = enrollments.find(
        (e) => e.classId === cls.classId && e.userId === userId
      )
      
      const totalEnrolled = enrollments.filter(
        (e) => e.classId === cls.classId && e.status === 'confirmed'
      ).length

      return {
        ...cls,
        isEnrolled: !!enrollment && enrollment.status === 'confirmed',
        enrollmentStatus: enrollment?.status,
        availableSpots: cls.maxParticipants - totalEnrolled,
        totalEnrolled,
      }
    })
  },
}))
