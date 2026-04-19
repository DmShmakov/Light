import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Avatar from '@mui/material/Avatar'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListItemButton from '@mui/material/ListItemButton'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationIcon from '@mui/icons-material/Notifications'
import { useAuthStore } from '../store/authStore'
import { logout } from '../services/authService'
import SubscriptionStatus from '../components/SubscriptionStatus'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/welcome')
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography>Необходимо войти в систему</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* Профиль пользователя */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Avatar
          src={user.photoUrl || undefined}
          sx={{ width: 100, height: 100, mb: 2 }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
        
        <Typography variant="h5" gutterBottom>
          {user.name}
        </Typography>
      </Box>

      {/* Абонемент */}
      <SubscriptionStatus />

      {/* Информация о пользователе */}
      <List sx={{ mb: 2 }}>
        <ListItem>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText
            primary="Имя"
            secondary={user.name}
          />
        </ListItem>

        <Divider />

        {user.email && (
          <>
            <ListItem>
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText
                primary="Email"
                secondary={user.email}
              />
            </ListItem>
            <Divider />
          </>
        )}

        <ListItem>
          <ListItemIcon>
            <PhoneIcon />
          </ListItemIcon>
          <ListItemText
            primary="Телефон"
            secondary={user.phone || 'Не указан'}
          />
        </ListItem>
      </List>

      {/* Настройки */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Настройки
      </Typography>

      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate('/notifications')}>
            <ListItemIcon>
              <NotificationIcon />
            </ListItemIcon>
            <ListItemText
              primary="Уведомления"
              secondary={user.preferences?.notificationsEnabled ? 'Включены' : 'Отключены'}
            />
          </ListItemButton>
        </ListItem>
      </List>

      {/* Кнопка выхода */}
      <Box sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          fullWidth
          onClick={handleLogout}
        >
          Выйти
        </Button>
      </Box>
    </Container>
  )
}
