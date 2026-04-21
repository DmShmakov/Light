import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { toggleUserRole } from '../../services/firestoreService'
import { notify } from '../../components/NotificationSnackbar'
import { User } from '../../types'

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingRole, setTogglingRole] = useState<string | null>(null) // userId

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const usersRef = collection(db, 'users')
        const snapshot = await getDocs(usersRef)
        const usersData = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as User[]

        setUsers(usersData)
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleToggleTrainer = async (user: User) => {
    const isTrainer = user.roles.includes('trainer')
    setTogglingRole(user.uid)
    try {
      await toggleUserRole(user.uid, 'trainer', !isTrainer)
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                roles: isTrainer
                  ? u.roles.filter((r) => r !== 'trainer')
                  : [...u.roles, 'trainer'],
              }
            : u
        )
      )
      notify({
        message: isTrainer
          ? `Роль тренера снята с ${user.name}`
          : `${user.name} назначен(а) тренером`,
        severity: 'success',
        duration: 3000,
      })
    } catch {
      notify({ message: 'Ошибка изменения роли', severity: 'error', duration: 3000 })
    } finally {
      setTogglingRole(null)
    }
  }

  // Фильтрация по поиску
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query)
    )
  })

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/admin')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Пользователи
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Поиск по имени, email или телефону..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <Skeleton variant="circular" width={56} height={56} />
            <Skeleton variant="text" width="40%" />
          </Box>
        ))
      ) : filteredUsers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {searchQuery ? 'Ничего не найдено' : 'Пользователей пока нет'}
          </Typography>
        </Box>
      ) : (
        <List>
          {filteredUsers.map((user) => {
            const isTrainer = user.roles.includes('trainer')
            return (
              <ListItem
                key={user.uid}
                sx={{ alignItems: 'flex-start', py: 1.5 }}
                secondaryAction={
                  <Button
                    size="small"
                    variant={isTrainer ? 'outlined' : 'contained'}
                    color={isTrainer ? 'error' : 'primary'}
                    startIcon={<FitnessCenterIcon />}
                    onClick={() => handleToggleTrainer(user)}
                    disabled={togglingRole === user.uid}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {isTrainer ? 'Снять тренера' : 'Тренер'}
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar src={user.photoUrl || undefined}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      {user.name}
                      {user.roles.includes('admin') && (
                        <Chip label="Админ" size="small" color="secondary" />
                      )}
                      {isTrainer && (
                        <Chip label="Тренер" size="small" color="primary" icon={<FitnessCenterIcon />} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {user.email && <span>Email: {user.email}</span>}
                      <span>Телефон: {user.phone}</span>
                      {user.createdAt && (
                        <span style={{ fontSize: '0.75rem' }}>
                          Регистрация: {user.createdAt.toLocaleDateString('ru-RU')}
                        </span>
                      )}
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
