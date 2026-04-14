import { useEffect, useState, useRef } from 'react'
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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { ru } from 'date-fns/locale'
import { addWeeks, isBefore, isSameDay } from 'date-fns'
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
  weekly: z.boolean().default(false),
  weeklyEndDate: z.date().optional(),
}).refine(
  (data) => {
    if (!data.weekly) return true
    if (!data.weeklyEndDate) return false
    // Дата окончания не более 1 года от startDateTime
    const maxDate = addWeeks(data.startDateTime, 52)
    return isBefore(data.weeklyEndDate, maxDate) || isSameDay(data.weeklyEndDate, maxDate)
  },
  {
    message: 'Период повторений не более 1 года',
    path: ['weeklyEndDate'],
  }
).refine(
  (data) => {
    if (!data.weekly) return true
    if (!data.weeklyEndDate) return false
    // Дата окончания должна быть позже startDateTime
    return isBefore(data.startDateTime, data.weeklyEndDate)
  },
  {
    message: 'Дата окончания должна быть позже даты начала',
    path: ['weeklyEndDate'],
  }
)

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
  const endDateTimeSet = useRef(false) // Была ли установлена дата окончания

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
      weekly: false,
      weeklyEndDate: undefined,
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
  // Вызывается прямо в onChange DateTimePicker, где доступно точное значение
  const handleStartDateTimeChange = (date: Date | null) => {
    if (date && !endDateTimeSet.current) {
      const endDate = new Date(date.getTime() + 60 * 60 * 1000)
      setValue('endDateTime', endDate, { shouldValidate: true })
    }
  }

  // Пометить, что endDateTime была загружена из базы или установлена вручную
  const endDateTimeWatch = watch('endDateTime')
  useEffect(() => {
    if (endDateTimeWatch) {
      endDateTimeSet.current = true
    }
  }, [endDateTimeWatch])

  const onSubmit = async (data: ClassForm) => {
    setLoading(true)
    setError(null)

    try {
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
      } else if (data.weekly && data.weeklyEndDate) {
        // Создание серии еженедельных занятий
        let currentDate = new Date(data.startDateTime)
        const endDate = new Date(data.weeklyEndDate)
        endDate.setHours(23, 59, 59, 999)

        let createdCount = 0
        while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
          const sessionDuration = data.endDateTime.getTime() - data.startDateTime.getTime()
          const sessionEnd = new Date(currentDate.getTime() + sessionDuration)

          const weeklyClassData: Omit<FitnessClass, 'classId' | 'createdAt'> = {
            ...classData,
            startDateTime: new Date(currentDate),
            endDateTime: sessionEnd,
          }

          await createClass(weeklyClassData)
          createdCount++

          // Следующая неделя
          currentDate = addWeeks(currentDate, 1)
        }
      } else {
        await createClass(classData)
      }

      navigate('/admin/schedule')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения. Попробуйте ещё раз.'
      console.error('Ошибка создания занятия:', err)
      setError(message)
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
                value={field.value ?? null}
                onChange={(date) => {
                  field.onChange(date)
                  handleStartDateTimeChange(date)
                }}
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
                value={field.value ?? null}
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

          {/* Еженедельное повторение — только при создании, не при редактировании */}
          {!isEditMode && (
            <>
              <Controller
                name="weekly"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Еженедельно (создать серию занятий)"
                  />
                )}
              />

              {watch('weekly') && (
                <Controller
                  name="weeklyEndDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Дата окончания периода"
                      value={field.value || null}
                      onChange={(date) => field.onChange(date)}
                      minDate={addWeeks(watch('startDateTime') || new Date(), 1)}
                      maxDate={addWeeks(watch('startDateTime') || new Date(), 52)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.weeklyEndDate,
                          helperText: errors.weeklyEndDate?.message || 'Занятия будут создаваться раз в неделю до этой даты',
                        },
                      }}
                    />
                  )}
                />
              )}
            </>
          )}

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading
              ? 'Сохранение...'
              : isEditMode
              ? 'Сохранить изменения'
              : watch('weekly')
              ? 'Создать серию занятий'
              : 'Создать занятие'}
          </Button>
        </Box>
      </Container>
    </LocalizationProvider>
  )
}
