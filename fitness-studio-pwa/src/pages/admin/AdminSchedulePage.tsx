import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import PeopleIcon from '@mui/icons-material/People'
import DeleteIcon from '@mui/icons-material/Delete'
import { format, isPast } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useScheduleStore } from '../../store/scheduleStore'
import { getClassesByWeek, deleteClass } from '../../services/firestoreService'
import { FitnessClass } from '../../types'

export default function AdminSchedulePage() {
  const navigate = useNavigate()
  const { classes, loading, setLoading, selectedWeekStart } = useScheduleStore()

  // Загрузка занятий
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
        console.error('Ошибка загрузки:', error)
      } finally {
        setLoading(false)
      }
    }

    loadClasses()
  }, [selectedWeekStart, setLoading])

  // Удаление занятия
  const handleDelete = async (classId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это занятие?')) return

    try {
      await deleteClass(classId)
      // Обновление списка
      const endDate = new Date(selectedWeekStart)
      endDate.setDate(endDate.getDate() + 6)
      const fetchedClasses = await getClassesByWeek(selectedWeekStart, endDate)
      useScheduleStore.getState().setClasses(fetchedClasses)
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка удаления занятия')
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Управление расписанием
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={() => navigate('/admin/schedule/create')}>
          Создать занятие
        </Button>
      </Box>

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
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Занятий на эту неделю нет
          </Typography>
          <Button variant="contained" onClick={() => navigate('/admin/schedule/create')}>
            Создать первое занятие
          </Button>
        </Box>
      ) : (
        classes.map((cls: FitnessClass) => (
          <Card key={cls.classId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6">{cls.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Тренер: {cls.trainerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(cls.startDateTime), 'd MMMM yyyy, HH:mm', { locale: ru })}
                  </Typography>
                  <Chip
                    label={isPast(new Date(cls.startDateTime)) ? 'Прошедшее' : 'Предстоящее'}
                    size="small"
                    color={isPast(new Date(cls.startDateTime)) ? 'default' : 'primary'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Tooltip title="Редактировать">
                <IconButton onClick={() => navigate(`/admin/schedule/edit/${cls.classId}`)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Участники">
                <IconButton onClick={() => navigate(`/admin/participants/${cls.classId}`)}>
                  <PeopleIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Удалить">
                <IconButton
                  color="error"
                  onClick={() => handleDelete(cls.classId)}
                  disabled={isPast(new Date(cls.startDateTime))}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        ))
      )}
    </Container>
  )
}
