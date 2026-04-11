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
import { format, isFuture, isPast } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../store/authStore'
import { getUserEnrollments } from '../services/firestoreService'
import { FitnessClass } from '../types'
import { getClassById } from '../services/firestoreService'

export default function MyEnrollmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) return

      setLoading(true)
      try {
        const userEnrollments = await getUserEnrollments(user.uid)
        const confirmedEnrollments = userEnrollments.filter((e) => e.status === 'confirmed')

        // Загрузка информации о занятиях
        const classesData = await Promise.all(
          confirmedEnrollments.map(async (enrollment) => {
            const fitnessClass = await getClassById(enrollment.classId)
            return fitnessClass
          })
        )

        setClasses(classesData.filter((c) => c !== null) as FitnessClass[])
      } catch (error) {
        console.error('Ошибка загрузки записей:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEnrollments()
  }, [user])

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">Для просмотра записей необходимо войти в систему</Alert>
      </Container>
    )
  }

  // Разделение на предстоящие и прошедшие
  const upcomingClasses = classes.filter((c) => isFuture(new Date(c.startDateTime)))
  const pastClasses = classes.filter((c) => !isFuture(new Date(c.startDateTime)) || isPast(new Date(c.endDateTime)))

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Мои записи
      </Typography>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" />
            </CardContent>
          </Card>
        ))
      ) : upcomingClasses.length === 0 && pastClasses.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            У вас пока нет записей на занятия
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/')}>
            Посмотреть расписание
          </Button>
        </Box>
      ) : (
        <>
          {/* Предстоящие занятия */}
          {upcomingClasses.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Предстоящие ({upcomingClasses.length})
              </Typography>
              
              {upcomingClasses.map((fitnessClass) => (
                <Card key={fitnessClass.classId} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {fitnessClass.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Тренер: {fitnessClass.trainerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(fitnessClass.startDateTime), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </Typography>
                    <Chip
                      label="Записан"
                      color="success"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/class/${fitnessClass.classId}`)}>
                      Подробнее
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}

          {/* Прошедшие занятия */}
          {pastClasses.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Прошедшие ({pastClasses.length})
              </Typography>
              
              {pastClasses.map((fitnessClass) => (
                <Card key={fitnessClass.classId} sx={{ mb: 2, opacity: 0.6 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {fitnessClass.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Тренер: {fitnessClass.trainerName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(fitnessClass.startDateTime), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </Typography>
                    <Chip
                      label="Завершено"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/class/${fitnessClass.classId}`)}>
                      Подробнее
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
    </Container>
  )
}
