import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import { resetPassword } from '../services/authService'

const recoverySchema = z.object({
  email: z.string().email('Введите корректный email'),
})

type RecoveryForm = z.infer<typeof recoverySchema>

export default function PasswordRecoveryPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoveryForm>({
    resolver: zodResolver(recoverySchema),
  })

  const onSubmit = async (data: RecoveryForm) => {
    try {
      setLoading(true)
      setError(null)
      await resetPassword(data.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки письма. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Письмо для восстановления пароля отправлено на ваш email.
        </Alert>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link component={RouterLink} to="/login" color="primary">
            Вернуться ко входу
          </Link>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Восстановление пароля
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Введите ваш email, и мы отправим ссылку для сброса пароля
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить ссылку для восстановления'}
        </Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          <Link component={RouterLink} to="/login" color="primary">
            Вернуться ко входу
          </Link>
        </Typography>
      </Box>
    </Container>
  )
}
