import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import IconButton from '@mui/material/IconButton'
import ShareIcon from '@mui/icons-material/Share'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { format, isPast, differenceInMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getClassById, enrollInClass, cancelEnrollment, getEnrollmentsForClass, getUserEnrollments } from '../services/firestoreService'
import { useAuthStore } from '../store/authStore'
import { useScheduleStore } from '../store/scheduleStore'
import { FitnessClass, Enrollment } from '../types'

const levelLabels: Record<string, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export default function ClassDetailsPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.roles.includes('admin') ?? false
  const enrollmentCounts = useScheduleStore((s) => s.enrollmentCounts)
  
  const [fitnessClass, setFitnessClass] = useState<FitnessClass | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  // Загрузка данных занятия
  useEffect(() => {
    const loadData = async () => {
      if (!classId) return

      setLoading(true)
      try {
        const classData = await getClassById(classId)
        setFitnessClass(classData)

        if (isAdmin) {
          // Админ видит все записи
          const enrollmentsData = await getEnrollmentsForClass(classId)
          setEnrollments(enrollmentsData)

          if (user) {
            const userEnrollment = enrollmentsData.find((e) => e.userId === user.uid)
            setIsEnrolled(!!userEnrollment)
            setEnrollmentId(userEnrollment?.enrollmentId || null)
          }
        } else {
          // Не-админ не видит список записей, только свой статус
          setEnrollments([])

          if (user) {
            const userEnrollments = await getUserEnrollments(user.uid)
            const myEnrollment = userEnrollments.find(
              (e) => e.classId === classId && e.status === 'confirmed'
            )
            setIsEnrolled(!!myEnrollment)
            setEnrollmentId(myEnrollment?.enrollmentId || null)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId, user])

  // Запись на занятие
  const handleEnroll = async () => {
    if (!user || !classId) {
      navigate('/login')
      return
    }

    setActionLoading(true)
    try {
      await enrollInClass(classId, user.uid)
      setIsEnrolled(true)
      
      // Обновляем счётчик на клиенте
      useScheduleStore.getState().incrementEnrollment(classId)
      
      // Обновляем список записей локально
      const fakeEnrollment: Enrollment = {
        enrollmentId: 'temp',
        classId,
        userId: user.uid,
        enrolledAt: new Date(),
        status: 'confirmed',
        waitlistPosition: null,
      }
      setEnrollments((prev) => [...prev, fakeEnrollment])
      
      setSnackbar({
        open: true,
        message: 'Вы успешно записаны на занятие!',
        severity: 'success',
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка записи. Попробуйте ещё раз.',
        severity: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Отмена записи
  const handleCancel = async () => {
    if (!enrollmentId) return

    setActionLoading(true)
    try {
      await cancelEnrollment(enrollmentId)
      setIsEnrolled(false)
      
      // Обновляем счётчик на клиенте
      useScheduleStore.getState().decrementEnrollment(classId!)
      
      // Обновляем список записей локально
      setEnrollments((prev) => prev.filter((e) => e.enrollmentId !== enrollmentId))
      
      setSnackbar({
        open: true,
        message: 'Запись отменена.',
        severity: 'info',
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка отмены. Попробуйте ещё раз.',
        severity: 'error',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Поделиться занятием
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/class/${classId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: fitnessClass?.title,
          text: `Записывайся на ${fitnessClass?.title}!`,
          url: shareUrl,
        })
      } catch (err) {
        // Пользователь отменил partage
      }
    } else {
      // Fallback: копирование в буфер обмена
      try {
        await navigator.clipboard.writeText(shareUrl)
        setSnackbar({
          open: true,
          message: 'Ссылка скопирована в буфер обмена',
          severity: 'success',
        })
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Не удалось скопировать ссылку',
          severity: 'error',
        })
      }
    }
  }

  if (loading || !fitnessClass) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography>Загрузка...</Typography>
      </Container>
    )
  }

  const isClassPast = isPast(new Date(fitnessClass.endDateTime))
  const minutesUntilStart = differenceInMinutes(new Date(fitnessClass.startDateTime), new Date())
  const canCancel = isEnrolled && !isClassPast && minutesUntilStart > 60 // TODO: получить из настроек

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* Кнопка назад и поделиться */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>

        <IconButton onClick={handleShare}>
          <ShareIcon />
        </IconButton>
      </Box>

      {/* Информация о занятии */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h4" component="h1">
              {fitnessClass.title}
            </Typography>
            <Chip
              label={levelLabels[fitnessClass.level]}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Typography variant="body1" color="text.secondary" paragraph>
            {fitnessClass.description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Тренер:</strong> {fitnessClass.trainerName}
            </Typography>

            <Typography variant="body2">
              <strong>Дата и время:</strong>{' '}
              {format(new Date(fitnessClass.startDateTime), 'd MMMM yyyy, HH:mm', { locale: ru })} — {' '}
              {format(new Date(fitnessClass.endDateTime), 'HH:mm', { locale: ru })}
            </Typography>

            <Typography variant="body2">
              <strong>Свободных мест:</strong>{' '}
              {isAdmin
                ? `${fitnessClass.maxParticipants - enrollments.length} из ${fitnessClass.maxParticipants}`
                : `${enrollmentCounts[fitnessClass.classId] ?? 0} записано из ${fitnessClass.maxParticipants}`}
            </Typography>

            <Typography variant="body2">
              <strong>Статус:</strong> {isClassPast ? 'Завершено' : 'Доступно для записи'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Список участников — только для админов */}
      {isAdmin && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Записавшиеся ({enrollments.length})
            </Typography>

            {enrollments.length > 0 ? (
              <AvatarGroup max={5}>
                {enrollments.slice(0, 10).map((enrollment) => (
                  <Avatar key={enrollment.enrollmentId} alt={enrollment.userId}>
                    {enrollment.userId.charAt(0).toUpperCase()}
                  </Avatar>
                ))}
              </AvatarGroup>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Пока никто не записан
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Кнопки действий */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {!isEnrolled ? (
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleEnroll}
            disabled={isClassPast || actionLoading}
          >
            {isClassPast ? 'Занятие завершено' : actionLoading ? 'Запись...' : 'Записаться'}
          </Button>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 1 }}>
              Вы записаны на это занятие
            </Alert>
            {canCancel ? (
              <Button
                variant="outlined"
                color="error"
                size="large"
                fullWidth
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Отменить запись
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">
                Отмена возможна не позднее чем за 60 минут до начала занятия
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Уведомления */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
