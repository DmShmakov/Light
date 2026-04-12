import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
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
import { useAuthStore } from '../../store/authStore'
import { FitnessClass } from '../../types'

const classSchema = z.object({
  title: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  type: z.string().min(1, 'Выберите тип занятия'),
  trainerName: z.string().min(2, 'Введите имя тренера'),
  startDateTime: z.date(),
  endDateTime: z.date(),
  maxParticipants: z.coerce.number().min(1, 'Минимум 1 участник').max(100),
  description: z.string().optional(),
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
  const { user } = useAuthStore()
  const isEditMode = !!classId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    handleSubmit,
    setValue,
    watch,
    control,
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
          setValue('description', classData.description || '')
          setValue('level', classData.level)
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err)
        setError('Ошибка загрузки данных занятия')
      }
    }

    loadClass()
  }, [isEditMode, classId, setValue])

  // Автозаполнение endDateTime = startDateTime + 1 час
  const startDateTimeValue = watch('startDateTime')
  useEffect(() => {
    if (startDateTimeValue) {
      const endDate = new Date(startDateTimeValue)
      endDate.setHours(endDate.getHours() + 1)

      // Проверяем, не было ли уже установлено значение
      const currentEnd = watch('endDateTime')
      if (!currentEnd) {
        setValue('endDateTime', endDate, { shouldValidate: true })
      }
    }
  }, [startDateTimeValue])

  const onSubmit = async (data: ClassForm) => {
    setLoading(true)
    setError(null)

    try {
      console.log('=== Создание занятия ===')
      console.log('User:', user)
      console.log('UID:', user?.uid)
      console.log('Roles:', user?.roles)
      
      const classData: Omit<FitnessClass, 'classId' | 'createdAt'> = {
        title: data.title,
        type: data.type,
        trainerId: user?.uid || '',
        trainerName: data.trainerName,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        maxParticipants: data.maxParticipants,
        description: data.description || '',
        level: data.level,
        status: 'scheduled',
      }

      console.log('Class data:', classData)

      if (isEditMode && classId) {
        await updateClass(classId, classData)
      } else {
        const newId = await createClass(classData)
        console.log('Создано занятие с ID:', newId)
      }

      navigate('/admin/schedule')
    } catch (err: any) {
      console.error('Ошибка создания занятия:', err)
      console.error('Code:', err.code)
      console.error('Message:', err.message)
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
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                label="Название"
                fullWidth
                {...field}
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Тип занятия"
                fullWidth
                {...field}
                error={!!errors.type}
                helperText={errors.type?.message}
              >
                {classTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="trainerName"
            control={control}
            render={({ field }) => (
              <TextField
                label="Имя тренера"
                fullWidth
                {...field}
                error={!!errors.trainerName}
                helperText={errors.trainerName?.message}
              />
            )}
          />

          <Controller
            name="startDateTime"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Дата и время начала"
                value={field.value}
                onChange={(date) => field.onChange(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDateTime,
                    helperText: errors.startDateTime?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="endDateTime"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Дата и время окончания"
                value={field.value}
                onChange={(date) => field.onChange(date)}
                minDate={watch('startDateTime')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endDateTime,
                    helperText: errors.endDateTime?.message,
                  },
                }}
              />
            )}
          />

          <Controller
            name="maxParticipants"
            control={control}
            render={({ field }) => (
              <TextField
                label="Максимальное количество участников"
                type="number"
                fullWidth
                {...field}
                error={!!errors.maxParticipants}
                helperText={errors.maxParticipants?.message}
              />
            )}
          />

          <Controller
            name="level"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Уровень сложности"
                fullWidth
                {...field}
                error={!!errors.level}
                helperText={errors.level?.message}
              >
                {levelOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                label="Описание"
                multiline
                rows={4}
                fullWidth
                {...field}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? 'Сохранение...' : isEditMode ? 'Сохранить изменения' : 'Создать занятие'}
          </Button>
        </Box>
      </Container>
    </LocalizationProvider>
  )
}
