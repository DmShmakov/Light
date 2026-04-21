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
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import CloseIcon from '@mui/icons-material/Close'
import PeopleIcon from '@mui/icons-material/People'
import { format, isPast, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import { useScheduleStore } from '../../store/scheduleStore'
import { getTrainerClasses, getEnrollmentsForClass, getEnrollmentCounts } from '../../services/firestoreService'
import { FitnessClass, Enrollment } from '../../types'
import WeekNavigator from '../../components/WeekNavigator'

export default function TrainerMyClassesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedWeekStart } = useScheduleStore()

  const [classes, setClasses] = useState<FitnessClass[]>([])
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Диалог участников
  const [dialogClass, setDialogClass] = useState<FitnessClass | null>(null)
  const [participants, setParticipants] = useState<Enrollment[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  useEffect(() => {
    const loadClasses = async () => {
      if (!user) return
      setLoading(true)
      try {
        const weekEnd = addDays(selectedWeekStart, 6)
        weekEnd.setHours(23, 59, 59, 999)
        const classesData = await getTrainerClasses(user.uid, selectedWeekStart, weekEnd)
        setClasses(classesData)
        if (classesData.length > 0) {
          const counts = await getEnrollmentCounts(classesData.map((c) => c.classId))
          setEnrollmentCounts(counts)
        } else {
          setEnrollmentCounts({})
        }
      } catch (error) {
        console.error('Ошибка загрузки занятий тренера:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClasses()
  }, [user, selectedWeekStart])

  const openParticipants = async (cls: FitnessClass) => {
    setDialogClass(cls)
    setParticipants([])
    setLoadingParticipants(true)
    try {
      const enrollments = await getEnrollmentsForClass(cls.classId)
      setParticipants(enrollments)
    } catch (error) {
      console.error('Ошибка загрузки участников:', error)
    } finally {
      setLoadingParticipants(false)
    }
  }

  const weekEnd = addDays(selectedWeekStart, 6)
  const upcomingClasses = classes.filter((c) => !isPast(new Date(c.endDateTime)))
  const pastClasses = classes.filter((c) => isPast(new Date(c.endDateTime)))

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <WeekNavigator />

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" />
            </CardContent>
          </Card>
        ))
      ) : classes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Нет занятий на{' '}
            {format(selectedWeekStart, 'd MMM', { locale: ru })} —{' '}
            {format(weekEnd, 'd MMM yyyy', { locale: ru })}
          </Typography>
        </Box>
      ) : (
        <>
          {upcomingClasses.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Предстоящие · {upcomingClasses.length}
              </Typography>
              {upcomingClasses.map((cls, idx) => (
                <TrainerClassCard
                  key={cls.classId}
                  cls={cls}
                  past={false}
                  enrolled={enrollmentCounts[cls.classId] ?? 0}
                  showDivider={idx < upcomingClasses.length - 1}
                  onDetails={() => navigate(`/class/${cls.classId}`)}
                  onParticipants={() => openParticipants(cls)}
                />
              ))}
            </Box>
          )}

          {pastClasses.length > 0 && (
            <Box>
              {upcomingClasses.length > 0 && <Divider sx={{ mb: 3 }} />}
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Прошедшие · {pastClasses.length}
              </Typography>
              {pastClasses.map((cls, idx) => (
                <TrainerClassCard
                  key={cls.classId}
                  cls={cls}
                  past={true}
                  enrolled={enrollmentCounts[cls.classId] ?? 0}
                  showDivider={idx < pastClasses.length - 1}
                  onDetails={() => navigate(`/class/${cls.classId}`)}
                  onParticipants={() => openParticipants(cls)}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {/* Диалог участников */}
      <Dialog
        open={!!dialogClass}
        onClose={() => setDialogClass(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Участники
            </Typography>
            {dialogClass && (
              <Typography variant="caption" color="text.secondary">
                {dialogClass.title} · {format(new Date(dialogClass.startDateTime), 'd MMM, HH:mm', { locale: ru })}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setDialogClass(null)} aria-label="Закрыть">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {loadingParticipants ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : participants.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Пока никто не записан
            </Typography>
          ) : (
            <List disablePadding>
              {participants.map((e) => (
                <ListItem key={e.enrollmentId} disablePadding sx={{ py: 0.5 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                      {e.userId.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={e.userId}
                    secondary={`Записан: ${format(new Date(e.enrolledAt), 'd MMM, HH:mm', { locale: ru })}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  )
}

interface TrainerClassCardProps {
  cls: FitnessClass
  past: boolean
  enrolled: number
  showDivider: boolean
  onDetails: () => void
  onParticipants: () => void
}

function TrainerClassCard({ cls, past, enrolled, showDivider, onDetails, onParticipants }: TrainerClassCardProps) {
  return (
    <>
      <Card sx={{ mb: 1, opacity: past ? 0.7 : 1 }}>
        <CardContent sx={{ pb: 0 }}>
          <Typography variant="h6" gutterBottom>
            {cls.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(cls.startDateTime), 'd MMMM, HH:mm', { locale: ru })} —{' '}
            {format(new Date(cls.endDateTime), 'HH:mm')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {past ? 'Посетило' : 'Записано'}: {enrolled} / {cls.maxParticipants}
            </Typography>
            <Chip
              label={past ? 'Завершено' : 'Предстоит'}
              color={past ? 'default' : 'success'}
              size="small"
            />
          </Box>
        </CardContent>
        <CardActions>
          <Button size="small" onClick={onParticipants} startIcon={<PeopleIcon />}>
            Участники
          </Button>
          <Button size="small" onClick={onDetails}>
            Подробнее
          </Button>
        </CardActions>
      </Card>
      {showDivider && <Divider sx={{ my: 1 }} />}
    </>
  )
}
