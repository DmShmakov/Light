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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { format, addWeeks, isToday, isPast } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useScheduleStore } from '../store/scheduleStore'
import { getClassesByWeek } from '../services/firestoreService'
import { FitnessClass } from '../types'

// Маппинг типов занятий на цвета
const classTypeColors: Record<string, 'default' | 'primary' | 'secondary'> = {
  yoga: 'primary',
  pilates: 'secondary',
  crossfit: 'primary',
  default: 'default',
}

// Маппинг уровней
const levelLabels: Record<string, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const { classes, loading, setLoading, selectedWeekStart, setSelectedWeekStart } = useScheduleStore()
  const [selectedDay, setSelectedDay] = useState(0)

  // Получение дней текущей недели
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  // Загрузка занятий при изменении недели
  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true)
      try {
        const endDate = new Date(selectedWeekStart)
        endDate.setDate(endDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)

        const fetchedClasses = await getClassesByWeek(selectedWeekStart, endDate)
        useScheduleStore.getState().setClasses(fetchedClasses)
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClasses()
  }, [selectedWeekStart])

  // Навигация по неделям
  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedWeekStart)
    prevWeek.setDate(prevWeek.getDate() - 7)
    setSelectedWeekStart(prevWeek)
    setSelectedDay(0)
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedWeekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setSelectedWeekStart(nextWeek)
    setSelectedDay(0)
  }

  // Фильтрация занятий по выбранному дню
  const selectedDate = weekDays[selectedDay]
  const filteredClasses = classes.filter((cls: FitnessClass) => {
    const classDate = new Date(cls.startDateTime)
    return (
      classDate.getDate() === selectedDate.getDate() &&
      classDate.getMonth() === selectedDate.getMonth() &&
      classDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Навигация по неделям */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={goToPreviousWeek}>
          <ChevronLeftIcon />
        </IconButton>
        
        <Typography variant="h6" align="center">
          {format(selectedWeekStart, 'd MMMM', { locale: ru })} — 
          {format(addWeeks(selectedWeekStart, 1), 'd MMMM yyyy', { locale: ru })}
        </Typography>

        <IconButton onClick={goToNextWeek}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Табы дней недели */}
      <Tabs
        value={selectedDay}
        onChange={(_event, newValue: number) => setSelectedDay(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {weekDays.map((day, index) => (
          <Tab
            key={index}
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" display="block">
                  {format(day, 'EEE', { locale: ru })}
                </Typography>
                <Typography variant="body2" display="block">
                  {format(day, 'dd')}
                </Typography>
                {isToday(day) && (
                  <Chip label="Сегодня" size="small" color="primary" sx={{ mt: 0.5 }} />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Список занятий */}
      {loading ? (
        // Скелетоны загрузки
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" />
            </CardContent>
          </Card>
        ))
      ) : filteredClasses.length === 0 ? (
        // Пустое состояние
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            На {format(selectedDate, 'd MMMM', { locale: ru })} занятий нет
          </Typography>
        </Box>
      ) : (
        // Карточки занятий
        filteredClasses.map((cls: FitnessClass) => {
          const isPastClass = isPast(new Date(cls.endDateTime))
          
          return (
            <Card
              key={cls.classId}
              sx={{
                mb: 2,
                opacity: isPastClass ? 0.6 : 1,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h2">
                    {cls.title}
                  </Typography>
                  <Chip
                    label={levelLabels[cls.level]}
                    size="small"
                    color={classTypeColors[cls.type] || 'default'}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Тренер: {cls.trainerName}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {format(new Date(cls.startDateTime), 'HH:mm')} — {format(new Date(cls.endDateTime), 'HH:mm')}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Свободно: {cls.maxParticipants} мест
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate(`/class/${cls.classId}`)}
                  disabled={isPastClass}
                >
                  Подробнее
                </Button>
              </CardActions>
            </Card>
          )
        })
      )}
    </Container>
  )
}
