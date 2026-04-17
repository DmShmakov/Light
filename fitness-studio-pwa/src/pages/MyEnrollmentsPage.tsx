import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import { format, isPast, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { useScheduleStore } from '../store/scheduleStore'
import { getUserEnrollmentsByDateRange, getClassById } from '../services/firestoreService'
import { FitnessClass } from '../types'
import WeekNavigator from '../components/WeekNavigator'

export default function MyEnrollmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedWeekStart } = useScheduleStore()
  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) return

      setLoading(true)
      try {
        const weekEnd = new Date(selectedWeekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        const enrollments = await getUserEnrollmentsByDateRange(user.uid, selectedWeekStart, weekEnd)

        const classesData = await Promise.all(
          enrollments.map((e) => getClassById(e.classId))
        )

        const sorted = (classesData.filter(Boolean) as FitnessClass[]).sort(
          (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
        )

        setClasses(sorted)
      } catch (error) {
        console.error('Ошибка загрузки записей:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEnrollments()
  }, [user, selectedWeekStart])

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">Для просмотра записей необходимо войти в систему</Alert>
      </Container>
    )
  }

  const weekEnd = addDays(selectedWeekStart, 6)
  const upcomingClasses = classes.filter((c) => !isPast(new Date(c.startDateTime)))
  const pastClasses = classes.filter((c) => isPast(new Date(c.startDateTime)))

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <WeekNavigator />

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" />
            </CardContent>
          </Card>
        ))
      ) : classes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Нет записей на{' '}
            {format(selectedWeekStart, 'd MMM', { locale: ru })} —{' '}
            {format(weekEnd, 'd MMM yyyy', { locale: ru })}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/')}>
            Посмотреть расписание
          </Button>
        </Box>
      ) : (
        <>
          {upcomingClasses.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Предстоящие · {upcomingClasses.length}
              </Typography>
              {upcomingClasses.map((cls, idx) => (
                <ClassCard
                  key={cls.classId}
                  cls={cls}
                  past={false}
                  showDivider={idx < upcomingClasses.length - 1}
                  onDetails={() => navigate(`/class/${cls.classId}`)}
                />
              ))}
            </Box>
          )}

          {pastClasses.length > 0 && (
            <Box>
              {upcomingClasses.length > 0 && <Divider sx={{ mb: 3 }} />}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Прошедшие · {pastClasses.length}
              </Typography>
              {pastClasses.map((cls, idx) => (
                <ClassCard
                  key={cls.classId}
                  cls={cls}
                  past={true}
                  showDivider={idx < pastClasses.length - 1}
                  onDetails={() => navigate(`/class/${cls.classId}`)}
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Container>
  )
}

interface ClassCardProps {
  cls: FitnessClass
  past: boolean
  showDivider: boolean
  onDetails: () => void
}

function ClassCard({ cls, past, showDivider, onDetails }: ClassCardProps) {
  return (
    <>
      <Card sx={{ mb: 1, opacity: past ? 0.6 : 1 }}>
        <CardContent sx={{ pb: 0 }}>
          <Typography variant="h6" gutterBottom>
            {cls.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(cls.startDateTime), 'd MMMM, HH:mm', { locale: ru })} — {format(new Date(cls.endDateTime), 'HH:mm')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Тренер: {cls.trainerName}
          </Typography>
          <Chip
            label={past ? 'Завершено' : 'Записан'}
            color={past ? 'default' : 'success'}
            size="small"
            sx={{ mt: 1 }}
          />
        </CardContent>
        <CardActions>
          <Button size="small" onClick={onDetails}>
            Подробнее
          </Button>
        </CardActions>
      </Card>
      {showDivider && <Divider sx={{ my: 1 }} />}
    </>
  )
}
