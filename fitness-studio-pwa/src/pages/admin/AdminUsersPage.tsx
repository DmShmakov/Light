import { useEffect, useState } from 'react'
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
import SearchIcon from '@mui/icons-material/Search'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { User } from '../../types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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
      <Typography variant="h5" component="h1" gutterBottom>
        Пользователи
      </Typography>

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
          {filteredUsers.map((user) => (
            <ListItem key={user.uid}>
              <ListItemAvatar>
                <Avatar src={user.photoUrl || undefined}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user.name}
                    {user.roles.includes('admin') && (
                      <Chip label="Админ" size="small" color="secondary" />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {user.email && <span>Email: {user.email}</span>}
                    <span>Телефон: {user.phone}</span>
                    {user.createdAt && (
                      <span style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        Регистрация: {user.createdAt.toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  )
}
