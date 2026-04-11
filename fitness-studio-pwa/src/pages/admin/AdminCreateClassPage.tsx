import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { ru } from 'date-fns/locale'
import { getClassById, createClass, updateClass } from '../../services/firestoreService'
import { FitnessClass } from '../../types'

const classSchema = z.object({
  title: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  type: z.string().min(1, 'Выберите тип занятия'),
  trainerName: z.string().min(2, 'Введите имя тренера'),
  startDateTime: z.date(),
  endDateTime: z.date(),
  maxParticipants: z.coerce.number().min(1, 'Минимум 1 участник').max(100),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
})

type ClassForm = z.infer<typeof classSchema>

const classTypes = [
  { value: 'yoga', label: 'Йога' },
  { value: 'pilates', label: 'Пилатес' },
  { value: 'crossfit', label: 'Кроссфит' },
  { value: 'stretching', label: 'Стретчинг' },
  { value: 'dance', label: 'Танцы' },
]

const levelOptions = [
  { value: 'beginner', label: 'Начальный' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
]

export default function AdminCreateClassPage() {
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()
  const isEditMode = !!classId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClassForm>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      title: '',
      type: 'yoga',
      trainerName: '',
      maxParticipants: 15,
      description: '',
      level: 'beginner',
    },
  })

  // Загрузка данных занятия при редактировании
  useEffect(() => {
    const loadClass = async () => {
      if (!isEditMode || !classId) return

      try {
        const classData = await getClassById(classId)
        if (classData) {
          setValue('title', classData.title)
          setValue('type', classData.type)
          setValue('trainerName', classData.trainerName)
          setValue('startDateTime', new Date(classData.startDateTime))
          setValue('endDateTime', new Date(classData.endDateTime))
          setValue('maxParticipants', classData.maxParticipants)
          setValue('description', classData.description)
          setValue('level', classData.level)
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err)
        setError('Ошибка загрузки данных занятия')
      }
    }

    loadClass()
  }, [isEditMode, classId, setValue])

  const onSubmit = async (data: ClassForm) => {
    setLoading(true)
    setError(null)

    try {
      const classData: Omit<FitnessClass, 'classId' | 'createdAt'> = {
        title: data.title,
        type: data.type,
        trainerId: 'admin-temp', // TODO: Получить из авторизации
        trainerName: data.trainerName,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        maxParticipants: data.maxParticipants,
        description: data.description,
        level: data.level,
        status: 'scheduled',
      }

      if (isEditMode && classId) {
        await updateClass(classId, classData)
      } else {
        await createClass(classData)
      }

      navigate('/admin/schedule')
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {isEditMode ? 'Редактирование занятия' : 'Создание занятия'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Название"
            fullWidth
            {...register('title')}
            error={!!errors.title}
            helperText={errors.title?.message}
          />

          <TextField
            select
            label="Тип занятия"
            fullWidth
            {...register('type')}
            error={!!errors.type}
            helperText={errors.type?.message}
          >
            {classTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Имя тренера"
            fullWidth
            {...register('trainerName')}
            error={!!errors.trainerName}
            helperText={errors.trainerName?.message}
          />

          <DateTimePicker
            label="Дата и время начала"
            value={watch('startDateTime')}
            onChange={(date) => date && setValue('startDateTime', date)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.startDateTime,
                helperText: errors.startDateTime?.message,
              },
            }}
          />

          <DateTimePicker
            label="Дата и время окончания"
            value={watch('endDateTime')}
            onChange={(date) => date && setValue('endDateTime', date)}
            minDate={watch('startDateTime')}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.endDateTime,
                helperText: errors.endDateTime?.message,
              },
            }}
          />

          <TextField
            label="Максимальное количество участников"
            type="number"
            fullWidth
            {...register('maxParticipants')}
            error={!!errors.maxParticipants}
            helperText={errors.maxParticipants?.message}
          />

          <TextField
            select
            label="Уровень сложности"
            fullWidth
            {...register('level')}
            error={!!errors.level}
            helperText={errors.level?.message}
          >
            {levelOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Описание"
            multiline
            rows={4}
            fullWidth
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать занятие'}
          </Button>
        </Box>
      </Container>
    </LocalizationProvider>
  )
}
