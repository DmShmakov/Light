import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { format, addWeeks, isToday, isPast, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useScheduleStore } from '../store/scheduleStore'
import { getClassesByWeek, getEnrollmentCounts } from '../services/firestoreService'
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

interface DayGroup {
  date: Date
  classes: FitnessClass[]
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const { classes, loading, setLoading, selectedWeekStart, setSelectedWeekStart, enrollmentCounts } = useScheduleStore()
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

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

        // Загрузка количества записей
        const classIds = fetchedClasses.map((c) => c.classId)
        const counts = await getEnrollmentCounts(classIds)
        useScheduleStore.getState().setEnrollmentCounts(counts)
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClasses()
  }, [selectedWeekStart])

  // Группировка занятий по дням
  const dayGroups: DayGroup[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(selectedWeekStart)
    date.setDate(date.getDate() + i)

    const dayClasses = classes.filter((cls: FitnessClass) => {
      const classDate = new Date(cls.startDateTime)
      return isSameDay(classDate, date)
    })

    dayGroups.push({
      date,
      classes: dayClasses.sort(
        (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      ),
    })
  }

  // Сортировка: сначала текущий день, потом остальные
  dayGroups.sort((a, b) => {
    const aIsToday = isToday(a.date)
    const bIsToday = isToday(b.date)
    if (aIsToday) return -1
    if (bIsToday) return 1
    return a.date.getTime() - b.date.getTime()
  })

  // Авто-раскрытие текущего дня
  useEffect(() => {
    const todayGroup = dayGroups.find((d) => isToday(d.date))
    if (todayGroup && !expandedDay) {
      setExpandedDay(format(todayGroup.date, 'yyyy-MM-dd'))
    }
  }, [dayGroups, classes])

  // Навигация по неделям
  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedWeekStart)
    prevWeek.setDate(prevWeek.getDate() - 7)
    setSelectedWeekStart(prevWeek)
    setExpandedDay(null)
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedWeekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    setSelectedWeekStart(nextWeek)
    setExpandedDay(null)
  }

  // Перекрытие дня
  const toggleDay = (dateStr: string) => {
    setExpandedDay(expandedDay === dateStr ? null : dateStr)
  }

  // Рендер карточки дня
  const renderDayCard = (dayGroup: DayGroup) => {
    const dateStr = format(dayGroup.date, 'yyyy-MM-dd')
    const isExpanded = expandedDay === dateStr
    const classCount = dayGroup.classes.length

    return (
      <Card key={dateStr} sx={{ mb: 1 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {format(dayGroup.date, 'EEEE', { locale: ru })}
              </Typography>
              {isToday(dayGroup.date) && (
                <Chip label="Сегодня" size="small" color="primary" />
              )}
            </Box>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              {format(dayGroup.date, 'd MMMM', { locale: ru })} · {classCount} {classCount === 1 ? 'занятие' : classCount < 5 ? 'занятия' : 'занятий'}
            </Typography>
          }
          action={
            <IconButton
              onClick={() => toggleDay(dateStr)}
              sx={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          }
          sx={{ cursor: 'pointer', py: 1 }}
          onClick={() => toggleDay(dateStr)}
        />

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider />
          <CardContent sx={{ pt: 1 }}>
            {dayGroup.classes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Занятий нет
              </Typography>
            ) : (
              dayGroup.classes.map((cls: FitnessClass) => {
                const isPastClass = isPast(new Date(cls.endDateTime))
                const enrolled = enrollmentCounts[cls.classId] || 0
                const available = cls.maxParticipants - enrolled

                return (
                  <Box key={cls.classId} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {cls.title}
                      </Typography>
                      <Chip
                        label={levelLabels[cls.level]}
                        size="small"
                        color={classTypeColors[cls.type] || 'default'}
                        variant="outlined"
                        sx={{ ml: 1, flexShrink: 0 }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(cls.startDateTime), 'HH:mm')} — {format(new Date(cls.endDateTime), 'HH:mm')} · {cls.trainerName}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ color: available === 0 ? 'error.main' : 'text.secondary', mb: 0.5 }}
                    >
                      {available === 0
                        ? 'Мест нет'
                        : `${available} из ${cls.maxParticipants} мест (записано: ${enrolled})`}
                    </Typography>

                    <CardActions sx={{ px: 0, pt: 0 }}>
                      <Button
                        size="small"
                        onClick={() => navigate(`/class/${cls.classId}`)}
                        disabled={isPastClass}
                      >
                        Подробнее
                      </Button>
                    </CardActions>

                    {cls.classId !== dayGroup.classes[dayGroup.classes.length - 1].classId && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </Box>
                )
              })
            )}
          </CardContent>
        </Collapse>
      </Card>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* Навигация по неделям */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={goToPreviousWeek}>
          <ChevronLeftIcon />
        </IconButton>

        <Typography variant="h6" align="center">
          {format(selectedWeekStart, 'd MMMM', { locale: ru })} —{' '}
          {format(addWeeks(selectedWeekStart, 1), 'd MMMM yyyy', { locale: ru })}
        </Typography>

        <IconButton onClick={goToNextWeek}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Список дней недели */}
      {loading ? (
        // Скелетоны загрузки
        Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} sx={{ mb: 1 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="text" width="30%" />
            </CardContent>
          </Card>
        ))
      ) : (
        dayGroups.map(renderDayCard)
      )}
    </Container>
  )
}
