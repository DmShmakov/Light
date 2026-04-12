import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import ListItemText from '@mui/material/ListItemText'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import { getEnrollmentsForClass, getClassById, cancelEnrollment } from '../../services/firestoreService'
import { Enrollment, FitnessClass, User } from '../../types'

interface EnrollmentWithUser extends Enrollment {
  user: User | null
}

export default function AdminParticipantsPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const [enrollments, setEnrollments] = useState<EnrollmentWithUser[]>([])
  const [fitnessClass, setFitnessClass] = useState<FitnessClass | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!classId) return

      setLoading(true)
      try {
        const [classData, enrollmentsData] = await Promise.all([
          getClassById(classId),
          getEnrollmentsForClass(classId),
        ])

        setFitnessClass(classData)

        // Загружаем данные пользователей
        const enrollmentsWithUsers: EnrollmentWithUser[] = await Promise.all(
          enrollmentsData.map(async (enrollment) => {
            const userDoc = await getDoc(doc(db, 'users', enrollment.userId))
            return {
              ...enrollment,
              user: userDoc.exists() ? (userDoc.data() as User) : null,
            }
          })
        )

        setEnrollments(enrollmentsWithUsers)
      } catch (error) {
        console.error('Ошибка загрузки:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [classId])

  const handleRemoveParticipant = async (enrollmentId: string) => {
    if (!confirm('Удалить участника из записи?')) return

    try {
      await cancelEnrollment(enrollmentId)
      // Обновляем список локально
      setEnrollments((prev) => prev.filter((e) => e.enrollmentId !== enrollmentId))
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('Ошибка удаления участника')
    }
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={40} />
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="circular" width={56} height={56} />
            <Skeleton variant="text" width="40%" />
          </Box>
        ))}
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/admin/schedule')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Участники: {fitnessClass?.title}
        </Typography>
      </Box>

      <Chip
        label={`Всего: ${enrollments.length} из ${fitnessClass?.maxParticipants}`}
        color="primary"
        sx={{ mb: 2 }}
      />

      {enrollments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            Пока никто не записан
          </Typography>
        </Box>
      ) : (
        <List>
          {enrollments.map((enrollment) => {
            const userName = enrollment.user?.name || 'Неизвестный'
            const userPhone = enrollment.user?.phone || 'Не указан'
            const userAvatar = enrollment.user?.photoUrl

            return (
              <ListItem
                key={enrollment.enrollmentId}
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => handleRemoveParticipant(enrollment.enrollmentId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar>
                  <Avatar src={userAvatar || undefined}>
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={userName}
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <span>📞 {userPhone}</span>
                      <span style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        Записан: {new Date(enrollment.enrolledAt).toLocaleString('ru-RU')}
                      </span>
                    </Box>
                  }
                />
              </ListItem>
            )
          })}
        </List>
      )}
    </Container>
  )
}
