import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import DeleteIcon from '@mui/icons-material/Delete'
import { getEnrollmentsForClass, getClassById } from '../../services/firestoreService'
import { Enrollment, FitnessClass } from '../../types'

export default function AdminParticipantsPage() {
  const { classId } = useParams<{ classId: string }>()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
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
        setEnrollments(enrollmentsData)
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

    // TODO: Реализовать удаление с обновлением списка
    console.log('Удалить участника:', enrollmentId)
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
      <Typography variant="h5" component="h1" gutterBottom>
        Участники: {fitnessClass?.title}
      </Typography>

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
          {enrollments.map((enrollment) => (
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
                <Avatar>
                  {enrollment.userId.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={enrollment.userId}
                secondary={`Записан: ${new Date(enrollment.enrolledAt).toLocaleString('ru-RU')}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  )
}
