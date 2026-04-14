import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import InfoIcon from '@mui/icons-material/Info'
import Tooltip from '@mui/material/Tooltip'
import { useAuthStore } from '../store/authStore'
import { useNotifications } from '../hooks/useNotifications'
import { notify } from '../components/NotificationSnackbar'
import { NotificationType, NOTIFICATION_TYPE_LABELS } from '../types'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    notificationTypes,
    initialize,
    toggle,
    updateType,
  } = useNotifications(user)

  const [error, setError] = useState<string | null>(null)

  // Если уведомления не поддерживаются
  if (!isSupported) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Уведомления</Typography>
        </Box>

        <Alert severity="warning">
          Уведомления не поддерживаются в вашем браузере. Попробуйте Chrome или Firefox.
        </Alert>
      </Container>
    )
  }

  const handleEnable = async () => {
    try {
      setError(null)
      const success = await initialize()

      if (success) {
        notify({ message: 'Уведомления включены', severity: 'success' })
      } else {
        notify({ message: 'Не удалось включить уведомления. Проверьте разрешения браузера.', severity: 'error' })
        setError('Разрешение отклонено. Включите уведомления в настройках браузера.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка включения уведомлений'
      setError(message)
    }
  }

  const handleDisable = async () => {
    try {
      setError(null)
      await toggle()
      notify({ message: 'Уведомления отключены', severity: 'info' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка отключения'
      setError(message)
    }
  }

  const handleTypeToggle = async (type: NotificationType) => {
    const current = notificationTypes[type] ?? true
    await updateType(type, !current)
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Уведомления</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Статус разрешений */}
      {permission === 'denied' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Уведомления заблокированы в браузере. Разрешите их в настройках сайта.
        </Alert>
      )}

      {/* Глобальный toggle */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isEnabled && permission === 'granted'}
              onChange={isEnabled && permission === 'granted' ? handleDisable : handleEnable}
              disabled={isLoading}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Включить уведомления
              <Tooltip title="Разрешить push-уведомления о занятиях и изменениях в расписании">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Box>
          }
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Типы уведомлений */}
      {isEnabled && permission === 'granted' && (
        <List disablePadding>
          {(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map((type) => (
            <ListItem key={type} disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={NOTIFICATION_TYPE_LABELS[type]}
                secondary={
                  type === 'class_reminder'
                    ? 'За 2 часа до занятия'
                    : type === 'admin_notifications'
                    ? 'Только для администраторов'
                    : undefined
                }
              />
              <Switch
                checked={notificationTypes[type] ?? true}
                onChange={() => handleTypeToggle(type)}
                disabled={isLoading || (type === 'admin_notifications' && !user?.roles.includes('admin'))}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Кнопка включения если отключено */}
      {!isEnabled && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" gutterBottom>
            Push-уведомления отключены
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Получайте напоминания о занятиях и узнавайте об изменениях в расписании
          </Typography>
          <Button variant="contained" onClick={handleEnable} disabled={isLoading}>
            {isLoading ? 'Включение...' : 'Включить уведомления'}
          </Button>
        </Box>
      )}
    </Container>
  )
}
